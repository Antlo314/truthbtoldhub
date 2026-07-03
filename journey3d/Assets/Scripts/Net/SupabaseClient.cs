using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Networking;

namespace Journey3D
{
    /// Thin REST client for the live Truth B Told Supabase backend.
    /// Read paths use the public anon key; score submits are attempted
    /// and fail soft if row-level security requires an authed soul.
    public class SupabaseClient : MonoBehaviour
    {
        public static SupabaseClient I { get; private set; }

        private void Awake()
        {
            if (I != null && I != this) { Destroy(gameObject); return; }
            I = this;
            DontDestroyOnLoad(gameObject);
        }

        private static string BearerToken =>
            WebAuth.SignedIn ? WebAuth.AccessToken : GameData.Config.supabaseAnonKey;

        private UnityWebRequest Get(string pathAndQuery)
        {
            var cfg = GameData.Config;
            var req = UnityWebRequest.Get($"{cfg.supabaseUrl}/rest/v1/{pathAndQuery}");
            req.SetRequestHeader("apikey", cfg.supabaseAnonKey);
            req.SetRequestHeader("Authorization", "Bearer " + BearerToken);
            return req;
        }

        // JsonUtility cannot parse a top-level array; wrap it.
        private static List<T> ParseArray<T>(string json)
        {
            try
            {
                var wrapped = JsonUtility.FromJson<Wrapper<T>>("{\"items\":" + json + "}");
                return wrapped?.items ?? new List<T>();
            }
            catch { return new List<T>(); }
        }

        [Serializable]
        private class Wrapper<T> { public List<T> items; }

        // ---------- The Ledger: bulletins ----------
        public void FetchBulletins(int limit, Action<List<BulletinRow>> done)
        {
            StartCoroutine(FetchBulletinsCo(limit, done));
        }

        private IEnumerator FetchBulletinsCo(int limit, Action<List<BulletinRow>> done)
        {
            using var req = Get($"bulletins?select=title,body,published_at,pinned&order=published_at.desc&limit={limit}");
            yield return req.SendWebRequest();
            done(req.result == UnityWebRequest.Result.Success
                ? ParseArray<BulletinRow>(req.downloadHandler.text)
                : new List<BulletinRow>());
        }

        // ---------- Seeing Glass / Archive: dispatches ----------
        public void FetchMedia(string kindsCsv, int limit, Action<List<MediaRow>> done)
        {
            StartCoroutine(FetchMediaCo(kindsCsv, limit, done));
        }

        private IEnumerator FetchMediaCo(string kindsCsv, int limit, Action<List<MediaRow>> done)
        {
            using var req = Get($"dispatch_media?select=title,kind,published_at&kind=in.({kindsCsv})&order=published_at.desc&limit={limit}");
            yield return req.SendWebRequest();
            done(req.result == UnityWebRequest.Result.Success
                ? ParseArray<MediaRow>(req.downloadHandler.text)
                : new List<MediaRow>());
        }

        // ---------- The Arcade: leaderboard ----------
        public void FetchLeaderboard(string game, string season, int limit, Action<List<LeaderboardRow>> done)
        {
            StartCoroutine(FetchLeaderboardCo(game, season, limit, done));
        }

        private IEnumerator FetchLeaderboardCo(string game, string season, int limit, Action<List<LeaderboardRow>> done)
        {
            using var req = Get($"arcade_scores?select=player_name,score,lines,level&game=eq.{game}&season=eq.{season}&order=score.desc&limit={limit}");
            yield return req.SendWebRequest();
            var rows = req.result == UnityWebRequest.Result.Success
                ? ParseArray<LeaderboardRow>(req.downloadHandler.text)
                : new List<LeaderboardRow>();
            // best-per-player, like the web lobby
            var best = new Dictionary<string, LeaderboardRow>();
            foreach (var r in rows)
            {
                var key = string.IsNullOrEmpty(r.player_name) ? "Anonymous Soul" : r.player_name;
                if (!best.ContainsKey(key) || r.score > best[key].score) best[key] = r;
            }
            var list = new List<LeaderboardRow>(best.Values);
            list.Sort((a, b) => b.score.CompareTo(a.score));
            done(list);
        }

        // ---------- The Arcade: submit run ----------
        public void SubmitScore(ScoreResult result, string playerName, Action<bool, string> done)
        {
            StartCoroutine(SubmitScoreCo(result, playerName, done));
        }

        private IEnumerator SubmitScoreCo(ScoreResult result, string playerName, Action<bool, string> done)
        {
            var cfg = GameData.Config;
            var name = string.IsNullOrEmpty(playerName) ? "Wandering Soul" : playerName;
            // built by hand so user_id is only present for a signed-in soul
            var body = "{\"player_name\":" + JsonString(name)
                     + ",\"game\":\"" + result.game + "\""
                     + ",\"score\":" + result.score
                     + ",\"lines\":" + result.lines
                     + ",\"level\":" + result.level
                     + ",\"season\":\"" + GameData.CurrentSeason() + "\""
                     + (WebAuth.SignedIn ? ",\"user_id\":\"" + WebAuth.UserId + "\"" : "")
                     + "}";
            using var req = new UnityWebRequest($"{cfg.supabaseUrl}/rest/v1/arcade_scores", "POST");
            req.uploadHandler = new UploadHandlerRaw(System.Text.Encoding.UTF8.GetBytes(body));
            req.downloadHandler = new DownloadHandlerBuffer();
            req.SetRequestHeader("Content-Type", "application/json");
            req.SetRequestHeader("apikey", cfg.supabaseAnonKey);
            req.SetRequestHeader("Authorization", "Bearer " + BearerToken);
            req.SetRequestHeader("Prefer", "return=minimal");
            yield return req.SendWebRequest();
            if (req.result == UnityWebRequest.Result.Success)
                done(true, "Run etched into the season board.");
            else
                done(false, WebAuth.SignedIn
                    ? "The board keeper could not etch the run. It is kept locally."
                    : "Sign in on truthbtoldhub.com to etch runs onto the season board. (Score kept locally.)");
        }

        private static string JsonString(string s) =>
            "\"" + s.Replace("\\", "\\\\").Replace("\"", "\\\"") + "\"";
    }
}

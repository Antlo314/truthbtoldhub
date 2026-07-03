// Bridge into the hosting truthbtoldhub.com page: reads the Supabase
// session that supabase-js stores in localStorage (sb-<ref>-auth-token),
// so the signed-in soul carries into the 3D hut. Same-origin only.
mergeInto(LibraryManager.library, {

  J3D_ReadSession: function () {
    var out = '';
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf('sb-') === 0 && k.indexOf('-auth-token') > 0) {
          var s = JSON.parse(localStorage.getItem(k));
          if (s && s.currentSession) s = s.currentSession;
          if (s && s.access_token) {
            out = JSON.stringify({
              token: s.access_token,
              userId: (s.user && s.user.id) || '',
              email: (s.user && s.user.email) || ''
            });
            break;
          }
        }
      }
    } catch (e) { out = ''; }
    return stringToNewUTF8(out);
  }

});

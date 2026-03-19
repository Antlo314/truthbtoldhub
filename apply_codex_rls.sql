-- Grant DELETE rights on codex_whispers and codex_replies

-- Whispers Deletion
CREATE POLICY "Users can delete their own whispers" 
ON public.codex_whispers 
FOR DELETE 
USING (auth.uid() = author_id);

CREATE POLICY "Architects can delete any whisper" 
ON public.codex_whispers 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.tier = 'Architect'
  )
);

-- Replies Deletion
CREATE POLICY "Users can delete their own replies" 
ON public.codex_replies 
FOR DELETE 
USING (auth.uid() = author_id);

CREATE POLICY "Architects can delete any reply" 
ON public.codex_replies 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.tier = 'Architect'
  )
);

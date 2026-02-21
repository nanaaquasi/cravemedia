-- Add review_text to journeys for journey-level reviews (when entire journey is completed)
ALTER TABLE journeys
  ADD COLUMN IF NOT EXISTS review_text text;

/*
  # Create User Scoring System

  1. New Views
    - `user_scores` - Real-time view that calculates scores for all users based on:
      - Building levels (100 points per level)
      - Research levels (200 points per level)
      - Population (1 point per citizen)
      - Cities (1000 points per city)

  2. Changes
    - Uses a regular view for real-time updates
    - Includes scoring weights that can be easily adjusted
    - Uses proper JSON aggregation for building levels
*/

-- Create view for user scores
CREATE VIEW user_scores AS
WITH building_scores AS (
  SELECT 
    c.user_id,
    SUM(
      (value->>'level')::integer * 100
    ) as building_score,
    COUNT(DISTINCT c.id) * 1000 as city_score,
    SUM(c.people) as total_population
  FROM cities c,
  jsonb_each(c.buildings) buildings(key, value)
  GROUP BY c.user_id
),
research_scores AS (
  SELECT 
    user_id,
    SUM(level) * 200 as research_score
  FROM research_levels
  GROUP BY user_id
)
SELECT 
  p.id,
  p.username,
  p.email,
  COALESCE(bs.building_score, 0) as building_score,
  COALESCE(rs.research_score, 0) as research_score,
  COALESCE(bs.city_score, 0) as city_score,
  COALESCE(bs.total_population, 0) as total_population,
  COALESCE(bs.building_score, 0) + 
  COALESCE(rs.research_score, 0) + 
  COALESCE(bs.city_score, 0) +
  COALESCE(bs.total_population, 0) as total_score
FROM profiles p
LEFT JOIN building_scores bs ON bs.user_id = p.id
LEFT JOIN research_scores rs ON rs.user_id = p.id;

-- Grant access to authenticated users
GRANT SELECT ON user_scores TO authenticated;
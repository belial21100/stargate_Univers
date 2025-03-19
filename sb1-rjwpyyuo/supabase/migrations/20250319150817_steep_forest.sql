/*
  # Add Research Types

  1. New Data
    - Add basic research types for the game
    - Set default values and requirements
*/

-- Insert research types if they don't exist
INSERT INTO research_types (id, name, description, category, base_cost, base_bonus, bonus_type, requirements)
VALUES
  (
    'weapons_research',
    'Weapons Research',
    'Improves the effectiveness of your weapons systems.',
    'combat',
    '{"naquadah": 1000, "deuterium": 800, "trinium": 500, "people": 10}',
    5.0,
    'weapon_damage',
    '{}'::jsonb
  ),
  (
    'shield_technology',
    'Shield Technology',
    'Enhances shield strength and regeneration.',
    'defense',
    '{"naquadah": 1200, "deuterium": 1000, "trinium": 600, "people": 10}',
    5.0,
    'shield_strength',
    '{"weapons_research": 1}'::jsonb
  ),
  (
    'propulsion_systems',
    'Propulsion Systems',
    'Increases ship speed and maneuverability.',
    'propulsion',
    '{"naquadah": 800, "deuterium": 1200, "trinium": 400, "people": 10}',
    5.0,
    'ship_speed',
    '{}'::jsonb
  ),
  (
    'resource_extraction',
    'Resource Extraction',
    'Improves resource gathering efficiency.',
    'resources',
    '{"naquadah": 500, "deuterium": 400, "trinium": 300, "people": 5}',
    3.0,
    'resource_production',
    '{}'::jsonb
  )
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  base_cost = EXCLUDED.base_cost,
  base_bonus = EXCLUDED.base_bonus,
  bonus_type = EXCLUDED.bonus_type,
  requirements = EXCLUDED.requirements;

-- Ensure all users have research levels
INSERT INTO research_levels (user_id, research_id, level, created_at, updated_at)
SELECT 
  p.id as user_id,
  rt.id as research_id,
  0 as level,
  now() as created_at,
  now() as updated_at
FROM profiles p
CROSS JOIN research_types rt
WHERE NOT EXISTS (
  SELECT 1 
  FROM research_levels rl 
  WHERE rl.user_id = p.id AND rl.research_id = rt.id
);
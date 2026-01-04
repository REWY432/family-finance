-- Add new expense categories: Хоз товары и Маркетплейсы

INSERT INTO app_categories (name, type, icon, color) VALUES
  ('Хоз товары', 'expense', '🧹', '#8BC34A'),
  ('Маркетплейсы', 'expense', '📦', '#FF7043')
ON CONFLICT DO NOTHING;


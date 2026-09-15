alter table public.tickets
  add constraint tickets_title_not_blank check (title ~ '\S'),
  add constraint tickets_description_not_blank check (description ~ '\S'),
  add constraint tickets_category_not_blank check (category ~ '\S');
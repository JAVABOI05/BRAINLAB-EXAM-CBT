-- Corrects legacy double-encoded Windows-1252/UTF-8 mojibake in existing questions and explanations.
update questions
set
  question = replace(replace(replace(replace(replace(question, 'â€"', '—'), 'â€”', '—'), 'â€“', '–'), 'â€™', ''''), 'â€œ', '"'),
  explanation = replace(replace(replace(replace(replace(explanation, 'â€"', '—'), 'â€”', '—'), 'â€“', '–'), 'â€™', ''''), 'â€œ', '"')
where question like '%â€%' or explanation like '%â€%';

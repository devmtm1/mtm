-- Répare les types réécrits en « text » par l'ancien comportement de la modification (le DTO de
-- modification héritait de la valeur par défaut du DTO de création) : les témoignages ne
-- s'affichaient plus sur le site, qui les lit par type.
UPDATE "content_blocks" SET "type" = 'testimonial'
 WHERE "key" LIKE 'testimonial.%' AND "type" <> 'testimonial';

UPDATE "content_blocks" SET "type" = 'stat'
 WHERE "key" ~ '^news\.[0-9]+\.tag$' AND "type" <> 'stat';

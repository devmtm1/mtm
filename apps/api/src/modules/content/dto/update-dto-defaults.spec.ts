import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { UpdateContentBlockDto } from './update-content-block.dto';
import { UpdateShowcaseItemDto } from './update-showcase-item.dto';

/**
 * Une modification ne doit contenir que ce que l'appelant a envoyé. Si le DTO de création porte
 * des valeurs par défaut, le DTO de modification les hérite et les réécrit à chaque enregistrement :
 * un témoignage passait ainsi du type « testimonial » à « text » et disparaissait du site.
 */
describe('DTO de modification sans valeurs par défaut', () => {
  it('bloc de contenu : modifier le texte ne touche ni le type ni l’ordre', () => {
    const dto = plainToInstance(UpdateContentBlockDto, {
      content: 'Nouveau texte',
    });
    expect({ ...dto }).toEqual({ content: 'Nouveau texte' });
  });

  it('élément de vitrine : modifier le titre ne touche ni l’ordre ni la publication', () => {
    const dto = plainToInstance(UpdateShowcaseItemDto, {
      title: 'Nouveau titre',
    });
    expect({ ...dto }).toEqual({ title: 'Nouveau titre' });
  });
});

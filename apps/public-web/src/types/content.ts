export type ContentBlockType = 'text' | 'hero' | 'testimonial' | 'stat';

export interface ContentBlock {
  key: string;
  title: string | null;
  content: string;
  type: ContentBlockType | string;
}

import PptxGenJS from 'pptxgenjs';

interface DeckBullet {
  text: string;
  subBullets?: string[];
}

interface InterestData {
  score: number;
  label: 'high' | 'neutral' | 'low';
  more: number;
  less: number;
}

export interface DeckSlide {
  title: string;
  bullets: DeckBullet[];
  speakerNotes?: string;
  interest?: InterestData;
}

export interface DeckOutline {
  deckTitle: string;
  slides: DeckSlide[];
}

interface GeneratePptxOptions {
  outline: DeckOutline;
  presenterName?: string;
}

/**
 * Generates a PowerPoint file from a deck outline and triggers download
 */
export async function generatePptx({ outline, presenterName }: GeneratePptxOptions): Promise<void> {
  const pptx = new PptxGenJS();

  // Set presentation properties
  pptx.title = outline.deckTitle;
  pptx.author = presenterName || 'Feedbacker App';
  pptx.subject = 'Presentation generated from audience feedback';

  // Define consistent styling
  const titleColor = '1a1a1a';
  const bodyColor = '374151';
  const accentColor = '7c3aed'; // violet-600

  // Title slide
  const titleSlide = pptx.addSlide();
  titleSlide.addText(outline.deckTitle, {
    x: 0.5,
    y: 2.5,
    w: 9,
    h: 1.5,
    fontSize: 44,
    fontFace: 'Arial',
    color: titleColor,
    bold: true,
    align: 'center',
  });

  if (presenterName) {
    titleSlide.addText(presenterName, {
      x: 0.5,
      y: 4.2,
      w: 9,
      h: 0.5,
      fontSize: 20,
      fontFace: 'Arial',
      color: bodyColor,
      align: 'center',
    });
  }

  titleSlide.addText('Generated from audience feedback', {
    x: 0.5,
    y: 5,
    w: 9,
    h: 0.4,
    fontSize: 12,
    fontFace: 'Arial',
    color: '9ca3af',
    align: 'center',
  });

  // Content slides
  for (const slide of outline.slides) {
    const contentSlide = pptx.addSlide();

    // Slide title
    contentSlide.addText(slide.title, {
      x: 0.5,
      y: 0.4,
      w: 9,
      h: 0.8,
      fontSize: 28,
      fontFace: 'Arial',
      color: titleColor,
      bold: true,
    });

    // Accent line under title
    contentSlide.addShape('rect' as PptxGenJS.ShapeType, {
      x: 0.5,
      y: 1.15,
      w: 1.5,
      h: 0.05,
      fill: { color: accentColor },
    });

    // Build bullet text array for pptxgenjs
    const bulletItems: PptxGenJS.TextProps[] = [];

    for (const bullet of slide.bullets) {
      // Main bullet
      bulletItems.push({
        text: bullet.text,
        options: {
          fontSize: 18,
          fontFace: 'Arial',
          color: bodyColor,
          bullet: { type: 'bullet' },
          indentLevel: 0,
          paraSpaceAfter: bullet.subBullets?.length ? 4 : 8,
        },
      });

      // Sub-bullets
      if (bullet.subBullets) {
        for (const subBullet of bullet.subBullets) {
          bulletItems.push({
            text: subBullet,
            options: {
              fontSize: 14,
              fontFace: 'Arial',
              color: '6b7280',
              bullet: { type: 'bullet' },
              indentLevel: 1,
              paraSpaceAfter: 4,
            },
          });
        }
      }
    }

    contentSlide.addText(bulletItems, {
      x: 0.5,
      y: 1.4,
      w: 9,
      h: 4.5,
      valign: 'top',
    });

    // Speaker notes
    if (slide.speakerNotes) {
      contentSlide.addNotes(slide.speakerNotes);
    }
  }

  // Generate and download
  const fileName = `${outline.deckTitle.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 50)}.pptx`;
  await pptx.writeFile({ fileName });
}

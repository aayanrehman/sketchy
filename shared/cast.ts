/** The player cast. `id` is the wire value stored on Player.avatar (the old emoji ids, so live rooms keep working). */
export interface CastMember { id: string; slug: string; name: string; role: string; look: string }

export const CAST: CastMember[] = [
  { id: '🦊', slug: 'fox', name: 'Rouge', role: 'The Forger', look: 'a sly orange fox art forger with a red silk scarf and a tiny paint palette, one eyebrow raised, smirking.' },
  { id: '🐸', slug: 'frog', name: 'Lily', role: 'The Painter', look: 'a cheerful green frog landscape painter wearing a wide straw sun hat with a paint brush tucked behind one ear.' },
  { id: '🦄', slug: 'unicorn', name: 'Glimmer', role: 'The Sculptor', look: 'a dreamy white unicorn sculptor with a lilac mane, a golden horn and a clay-smudged work apron.' },
  { id: '🐙', slug: 'octopus', name: 'Inky', role: 'The Calligrapher', look: 'a pink octopus calligrapher holding fountain pens in three tentacles, with round spectacles and an ink splash on one cheek.' },
  { id: '🐼', slug: 'panda', name: 'Bao', role: 'The Photographer', look: 'a round panda photographer with a vintage camera on a strap around the neck and a backwards cap.' },
  { id: '🦁', slug: 'lion', name: 'Maestro', role: 'The Critic', look: 'a pompous lion art critic with a big golden mane, a monocle and a purple bow tie, nose in the air.' },
  { id: '🐧', slug: 'penguin', name: 'Pip', role: 'The Night Guard', look: 'a nervous little penguin museum night guard in a navy guard cap with a badge, holding a flashlight.' },
  { id: '🐲', slug: 'dragon', name: 'Ember', role: 'The Street Artist', look: 'a playful mint-green baby dragon street artist in a yellow hoodie holding a spray paint can, tiny wings.' },
];
export const castOf = (avatar: string) => CAST.find((c) => c.id === avatar) || CAST[0];

/** The AI detective who sits at every Prompt-mode table. */
export const DETECTIVE = { id: 'luna', slug: 'luna', name: 'Inspector Luna', role: 'The AI Detective', look: 'a wise round grey owl detective in a deerstalker hat and a little tan trench coat collar, holding a big magnifying glass, a crescent moon pin on the collar, one eye looking through the glass.' };

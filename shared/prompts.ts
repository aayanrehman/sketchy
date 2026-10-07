import type { PromptPair } from './types';

/** Starter set from the PRD: 24 pairs including the Career pack. */
export const PROMPT_PAIRS: PromptPair[] = [
  {"id": 1, "theme": "Vampires", "real": "A vampire at the gym", "decoy": "A vampire at the dentist", "stealDecoys": ["A vampire at the beach", "A vampire at a wedding", "A vampire at a restaurant"]},
  {"id": 2, "theme": "Cats", "real": "A cat DJ", "decoy": "A cat chef", "stealDecoys": ["A cat astronaut", "A cat firefighter", "A cat painter"]},
  {"id": 3, "theme": "Snowmen", "real": "A snowman at the beach", "decoy": "A snowman in a sauna", "stealDecoys": ["A snowman at the gym", "A snowman on a plane", "A snowman at a picnic"]},
  {"id": 4, "theme": "Pirates", "real": "A pirate on a skateboard", "decoy": "A pirate on a surfboard", "stealDecoys": ["A pirate on a horse", "A pirate on a bike", "A pirate on roller skates"]},
  {"id": 5, "theme": "Robots", "real": "A robot walking a dog", "decoy": "A robot walking a dinosaur", "stealDecoys": ["A robot walking a cat", "A robot walking a fish", "A robot walking a rabbit"]},
  {"id": 6, "theme": "Ghosts", "real": "A ghost taking a selfie", "decoy": "A ghost doing laundry", "stealDecoys": ["A ghost baking a cake", "A ghost playing tennis", "A ghost washing dishes"]},
  {"id": 7, "theme": "Sharks", "real": "A shark at a job interview", "decoy": "A shark on a first date", "stealDecoys": ["A shark at the doctor", "A shark at a concert", "A shark at school"]},
  {"id": 8, "theme": "Wizards", "real": "A wizard stuck in traffic", "decoy": "A wizard at a drive-thru", "stealDecoys": ["A wizard at the gym", "A wizard at the library", "A wizard waiting for a bus"]},
  {"id": 9, "theme": "Frogs", "real": "A frog playing guitar", "decoy": "A frog playing drums", "stealDecoys": ["A frog playing piano", "A frog playing soccer", "A frog playing violin"]},
  {"id": 10, "theme": "Cows", "real": "A cow on the moon", "decoy": "A cow on a roller coaster", "stealDecoys": ["A cow on a boat", "A cow on a stage", "A cow on a train"]},
  {"id": 11, "theme": "Grandmas", "real": "Grandma at a rock concert", "decoy": "Grandma at a boxing match", "stealDecoys": ["Grandma at a skate park", "Grandma at a rave", "Grandma at a dance class"]},
  {"id": 12, "theme": "Dragons", "real": "A dragon at a birthday party", "decoy": "A dragon at a wedding", "stealDecoys": ["A dragon at a funeral", "A dragon at a sleepover", "A dragon at a picnic"]},
  {"id": 13, "theme": "Penguins", "real": "A penguin taking a final exam", "decoy": "A penguin giving a speech", "stealDecoys": ["A penguin at a job fair", "A penguin in detention", "A penguin in a classroom"]},
  {"id": 14, "theme": "Aliens", "real": "An alien ordering pizza", "decoy": "An alien getting a haircut", "stealDecoys": ["An alien doing taxes", "An alien at the DMV", "An alien buying groceries"]},
  {"id": 15, "theme": "Dinosaurs", "real": "A dinosaur doing yoga", "decoy": "A dinosaur lifting weights", "stealDecoys": ["A dinosaur doing ballet", "A dinosaur playing golf", "A dinosaur swimming"]},
  {"id": 16, "theme": "Bananas", "real": "A banana in a superhero cape", "decoy": "A banana in a wedding dress", "stealDecoys": ["A banana in a tuxedo", "A banana in a spacesuit", "A banana in a raincoat"]},
  {"id": 17, "theme": "Bears", "real": "A bear going camping", "decoy": "A bear going fishing", "stealDecoys": ["A bear going skiing", "A bear going shopping", "A bear going hiking"]},
  {"id": 18, "theme": "Cacti", "real": "A cactus giving a hug", "decoy": "A cactus getting a massage", "stealDecoys": ["A cactus high-fiving", "A cactus getting a haircut", "A cactus shaking hands"]},
  {"id": 19, "theme": "Chickens", "real": "A chicken driving a car", "decoy": "A chicken flying a plane", "stealDecoys": ["A chicken riding a bike", "A chicken sailing a boat", "A chicken riding a scooter"]},
  {"id": 20, "theme": "Mermaids", "real": "A mermaid at the office", "decoy": "A mermaid at the mall", "stealDecoys": ["A mermaid at school", "A mermaid at the gym", "A mermaid at a cafe"]},
  {"id": 21, "theme": "Career", "real": "An intern's first day", "decoy": "A CEO's first day", "stealDecoys": ["A teacher's first day", "A chef's first day", "A nurse’s first day"]},
  {"id": 22, "theme": "Career", "real": "A job interview on Zoom", "decoy": "A job interview on a roller coaster", "stealDecoys": ["A job interview in an elevator", "A job interview at the beach", "A job interview on a train"]},
  {"id": 23, "theme": "Career", "real": "A coffee run for the whole office", "decoy": "A fire drill at the office", "stealDecoys": ["A pizza party at the office", "A power outage at the office", "A birthday party at the office"]},
  {"id": 24, "theme": "Career", "real": "A career fair booth", "decoy": "A lemonade stand", "stealDecoys": ["A bake sale table", "A farmers market stall", "A ticket booth"]}
];

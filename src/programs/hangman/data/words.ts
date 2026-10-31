/**
 * Hangman words by category. Letters and spaces only; spaces are shown from
 * the start. Add categories or words freely.
 */
export const CATEGORIES = {
  Animals: [
    "elephant", "giraffe", "penguin", "kangaroo", "dolphin", "octopus", "squirrel", "hedgehog", "flamingo",
    "crocodile", "butterfly", "jellyfish", "chameleon", "armadillo", "porcupine", "rhinoceros", "hamster",
    "panther", "walrus", "badger", "otter", "raccoon", "koala", "zebra", "camel", "lobster", "polar bear",
    "golden retriever", "sea turtle", "honey badger",
  ],
  Food: [
    "spaghetti", "pancake", "broccoli", "avocado", "croissant", "lasagna", "pineapple", "cucumber", "mushroom",
    "blueberry", "cheesecake", "dumpling", "burrito", "pretzel", "waffle", "noodles", "omelette", "popcorn",
    "cinnamon", "sandwich", "meatball", "pumpkin", "watermelon", "french fries", "hot dog", "ice cream",
    "fish and chips", "apple pie", "garlic bread", "banana split",
  ],
  Countries: [
    "denmark", "australia", "brazil", "canada", "egypt", "finland", "germany", "iceland", "indonesia", "japan",
    "kenya", "mexico", "morocco", "norway", "portugal", "sweden", "switzerland", "thailand", "argentina",
    "vietnam", "greece", "ireland", "jamaica", "mongolia", "nepal", "peru", "new zealand", "south korea",
    "united kingdom", "costa rica",
  ],
  Jobs: [
    "astronaut", "plumber", "librarian", "carpenter", "dentist", "firefighter", "journalist", "lifeguard",
    "mechanic", "pharmacist", "photographer", "professor", "programmer", "scientist", "surgeon", "teacher",
    "veterinarian", "architect", "electrician", "zookeeper", "baker", "pilot", "lawyer", "farmer", "chef",
    "taxi driver", "bus driver", "game designer", "park ranger", "personal trainer",
  ],
  Sports: [
    "football", "basketball", "volleyball", "badminton", "handball", "swimming", "cycling", "gymnastics",
    "skateboarding", "snowboarding", "surfing", "archery", "fencing", "wrestling", "marathon", "hockey",
    "baseball", "cricket", "rugby", "tennis", "golf", "rowing", "boxing", "karate", "climbing", "table tennis",
    "figure skating", "water polo", "ski jumping", "beach volleyball",
  ],
  "Around the House": [
    "refrigerator", "microwave", "toaster", "bookshelf", "curtains", "doorbell", "dishwasher", "fireplace",
    "lampshade", "mattress", "pillow", "radiator", "staircase", "umbrella", "wardrobe", "blanket", "cupboard",
    "doormat", "keyboard", "mailbox", "teapot", "vacuum", "candle", "mirror", "kettle", "coffee table",
    "washing machine", "alarm clock", "remote control", "light bulb",
  ],
  Computers: [
    "keyboard", "monitor", "floppy disk", "hard drive", "motherboard", "processor", "printer", "scanner",
    "modem", "screensaver", "wallpaper", "desktop", "shortcut", "folder", "recycle bin", "start menu",
    "taskbar", "mouse pad", "joystick", "speakers", "password", "download", "browser", "email", "virus",
    "update", "reboot", "blue screen", "control panel", "minesweeper",
  ],
} as const satisfies Record<string, readonly string[]>;

export type Category = keyof typeof CATEGORIES;
export const CATEGORY_NAMES = Object.keys(CATEGORIES) as Category[];

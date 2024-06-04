import type { Character } from "@/types/character";
import { owlbearPlayerName } from "./owlbear";
import * as UUID from "uuid";
import { ref, watch } from "vue";
import { CHARACTERS_STORE, getDb } from "./db";

export const characters = ref<Character[]>([]);
loadCharacters().then((c) => (characters.value = c));

watch(characters, saveCharacters, { deep: true });

export async function saveCharacters(characters: Character[]) {
  const db = await getDb();
  const transaction = db.transaction(CHARACTERS_STORE, "readwrite");
  const store = transaction.objectStore(CHARACTERS_STORE);
  store.clear();
  for (const character of characters) {
    const cloneableCharacter = { ...character, gear: [...character.gear] };
    await store.put(cloneableCharacter, character.uuid);
  }
  transaction.commit();
}

export async function loadCharacters(): Promise<Character[]> {
  const db = await getDb();
  const transaction = db.transaction(CHARACTERS_STORE, "readonly");
  const store = transaction.objectStore(CHARACTERS_STORE);
  const req = await store.getAll();
  if (!req) {
    return [];
  }
  transaction.commit();
  return new Promise((resolve) => {
    req.onsuccess = () => {
      resolve(req.result as Character[]);
    };
  });
}

export function downloadCharacter(character: Character) {
  const file = new File(
    [JSON.stringify(character)],
    `${character.characterName}.json`,
    {
      type: "text/json",
    }
  );
  // Create a link and set the URL using `createObjectURL`
  const link = document.createElement("a");
  link.style.display = "none";
  link.href = URL.createObjectURL(file);
  link.download = file.name;

  // It needs to be added to the DOM so it can be clicked
  document.body.appendChild(link);
  link.click();

  // To make this work on Firefox we need to wait
  // a little while before removing it.
  setTimeout(() => {
    URL.revokeObjectURL(link.href);
    document.body.removeChild(link);
  }, 0);
}

export function isCharacterValid(character: Character): boolean {
  const fieldsToVerify: Record<keyof Character, string> = {
    // dev
    uuid: "string",
    sync: "boolean",

    // info
    playerName: "string",
    characterName: "string",
    background: "string",
    ancestry: "string",
    characterClass: "string",
    level: "string",

    // stats
    strength: "string",
    dexterity: "string",
    constitution: "string",
    intelligence: "string",
    wisdom: "string",
    charisma: "string",

    // resources
    currentHealth: "string",
    health: "string",
    armor: "string",
    luck: "string",

    skills: "string",
    attacks: "string",
    gear: "object", // array is a type of 'object'
    notes: "string",
    gold: "string",
  };
  for (const field of Object.keys(fieldsToVerify) as Array<keyof Character>) {
    if (typeof character[field] !== fieldsToVerify[field]) {
      return false;
    }

    if (typeof character[field] === "object") {
      if (!Array.isArray(character[field])) {
        return false;
      }
    }
  }

  return true;
}

export async function uploadCharacter(): Promise<Character | null> {
  const input = document.createElement("input");
  input.setAttribute("type", "file");
  input.setAttribute("accept", ".json");
  input.style.display = "none";
  document.body.appendChild(input);

  const character = await new Promise<Character | null>((resolve) => {
    input.onchange = function () {
      if (!input.files) return resolve(null);
      const file = input.files[0];
      const reader = new FileReader();
      reader.addEventListener("load", (event) => {
        if (!event.target) return resolve(null);
        const data = event.target.result as string;
        if (!data) return resolve(null);
        document.body.removeChild(input);
        resolve(JSON.parse(data) as Character);
      });
      reader.readAsText(file);
    };
    input.onabort = function () {
      document.body.removeChild(input);
      resolve(null);
    };
    input.oncancel = function () {
      document.body.removeChild(input);
      resolve(null);
    };
    input.click();
  });

  if (character && !isCharacterValid(character)) {
    alert(
      "validation error occured when loading character, some of the info may not be correct"
    );
  }

  return character;
}

export function createNewCharacter(): Character {
  return {
    uuid: UUID.v4(),
    sync: false,
    playerName: owlbearPlayerName.value,
    characterName: `Character ${characters.value.length + 1}`,
    ancestry: "",
    attacks: "",
    background: "",
    characterClass: "",
    level: "1",

    strength: "10",
    dexterity: "10",
    constitution: "10",
    intelligence: "10",
    wisdom: "10",
    charisma: "10",

    currentHealth: "5",
    health: "5",
    armor: "10",
    luck: "0",

    gear: new Array(20).fill(""),
    gold: "30",
    notes: "",
    skills: "",
  };
}

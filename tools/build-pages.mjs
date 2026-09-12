import { appendFile, copyFile, lstat, mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";

export const publicFiles = Object.freeze([
  "01_heldere_zon.png",
  "02_half_bewolkt.png",
  "03_zwaar_bewolkt.png",
  "04_betrokken.png",
  "05_motregen.png",
  "06_lichte_regen.png",
  "07_zware_regen.png",
  "08_plaatselijke_regenbui.png",
  "09_onweer.png",
  "10_hagelbui.png",
  "11_lichte_sneeuw.png",
  "12_zware_sneeuw.png",
  "13_sneeuwstorm.png",
  "14_natte_sneeuw.png",
  "15_ijzel.png",
  "16_dichte_mist.png",
  "17_nevel.png",
  "18_harde_wind.png",
  "23_regenboog_na_regen.png",
  "24_hittegolf.png",
  "25_strenge_vorst.png",
  "Geen 1.png",
  "Geen 2.png",
  "Geen 3.png",
  "Geen 4.png",
  "Halloween.jpg",
  "Halloween.mp4",
  "Happy Mother's Day! - Animated Card.mp4",
  "Happy_Eastern_Fijne_Pasen_Soft.mp4",
  "Herfst.jpg",
  "KCD.jpg",
  "Kernwaarde.png",
  "Kerst.jpg",
  "Kerst.mp4",
  "Koningsdag.jpg",
  "Koningsdag.mp4",
  "Lente.jpg",
  "Moederdag.jpg",
  "Nieuwjaar.jpg",
  "Nieuwjaar.mp4",
  "Oudjaar.jpg",
  "Pasen.jpg",
  "Payday.mp4",
  "Sinterklaas.mp4",
  "Vaderdag.jpg",
  "Vaderdag.mp4",
  "Valentijn.mp4",
  "Valentijns.jpg",
  "Verjaardag.mp4",
  "Weer.json",
  "Winter.jpg",
  "Zomer.jpg",
  "app.js",
  "background-brightness.css",
  "background-contrast.css",
  "effect-combinations.css",
  "external-sites.css",
  "index.html",
  "leave-source-filename.js",
  "occasion-auto.css",
  "public-salary-payments.css",
  "rainbow-clock-restore.js",
  "sinterklaas.jpg",
  "start-weather.css",
  "team-contacts.css",
  "theme-customizer-colors.css",
  "theme-customizer.css",
  "theme-quick-choices.css",
  "timezone-background.js",
  "video-library.css"
]);

export async function stagePages(root, destination) {
  // This list contains only reviewed public assets. Never copy the repository.
  await mkdir(destination, { recursive: true });
  for (const file of publicFiles) {
    const info = await lstat(join(root, file));
    if (!info.isFile() || info.isSymbolicLink()) throw new Error(`Non-regular public asset: ${file}`);
    await copyFile(join(root, file), join(destination, file));
  }
  await writeFile(join(destination, ".nojekyll"), "");
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const destination = await mkdtemp(join(process.env.RUNNER_TEMP || tmpdir(), "collegaportaal-pages-"));
  await stagePages(process.cwd(), destination);
  if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `pages_path=${destination}\n`);
  console.log(`Staged ${publicFiles.length} reviewed public assets.`);
}

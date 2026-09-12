# Beveiligingsstatus CollegaPortaal

CollegaPortaal is een openbare, statische startpagina. De actieve code verwerkt, bewaart of toont geen inloggegevens, roostergegevens of trafficgegevens.

## Beheerregels

- Voeg uitsluitend algemene, publiceerbare informatie toe.
- Plaats geen persoonsgegevens, credentials, roosters, trafficdata, tokens of interne operationele informatie in deze repository.
- Controleer na wijzigingen de Security Audit en Repo health workflow.

## Publicatiecontrole

De Pages-workflow voert de veiligheids- en referentiecontroles uit vóór het samenstellen van het artifact. Alleen de expliciete openbare bestandenlijst wordt gekopieerd. Git-gegevens, documentatie, tools en onverwachte nieuwe bestanden worden niet meegepubliceerd. Alleen de deployjob heeft Pages- en OIDC-schrijfrechten; die job voert geen repositorycode uit en vereist een geslaagde build op `main`.

CODEOWNERS en workflows vervangen geen onafhankelijke branchregels. Controleer accountbeveiliging, vereiste reviews en vereiste statuscontroles via de GitHub-instellingen.

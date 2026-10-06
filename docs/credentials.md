# Zugangsdaten für Kontaktformular und Agent

## Brevo für das Kontaktformular einrichten

Das Formular nutzt die Brevo-API für eine Nachricht an ein festes Empfängerpostfach. Eine Newsletterliste oder ein E-Mail-Template ist dafür nicht nötig. Die Adresse der anfragenden Person wird als Antwortadresse gesetzt, nicht als Absender.

1. Bei [Brevo](https://app.brevo.com/) anmelden und die Kontoangaben vervollständigen.
2. Unter **Einstellungen → Absender, Domains, IPs → Domains** die eigene Absenderdomain hinzufügen. Die von Brevo angezeigten DNS-Einträge beim Domainanbieter eintragen und die Authentifizierung prüfen. Nur eine selbst kontrollierte Domain verwenden, keine Gmail-Adresse oder `pages.dev`. Bei einem vorhandenen DMARC-Eintrag die Angaben mit Brevos Anleitung abgleichen. [Domainauthentifizierung](https://help.brevo.com/hc/en-us/articles/12163873383186-Authenticate-your-domain-with-Brevo-Brevo-code-DKIM-DMARC)
3. Unter **Absender → Absender hinzufügen** den Namen `Flying Stars` und die gewünschte Absenderadresse eintragen. Eine authentifizierte Domain verifiziert den Absender automatisch. Andernfalls den sechsstelligen Code aus der Bestätigungsmail eingeben. Diese Adresse wird `CONTACT_FROM`. [Absender einrichten](https://help.brevo.com/hc/en-us/articles/208836149-Create-a-new-sender-From-name-and-From-email)
4. [SMTP & API → API-Schlüssel](https://app.brevo.com/settings/keys/api) öffnen. **Neuen API-Schlüssel generieren** wählen, `Flying Stars Kontaktformular` als Namen vergeben und generieren. Hier wird ein API-Schlüssel benötigt, kein SMTP-Schlüssel. Der Schlüssel erscheint nur einmal. Im Passwortmanager speichern und direkt im vorgesehenen Secret-Feld hinterlegen, nicht in Chat, Issues oder Git. [API-Schlüssel erstellen](https://developers.brevo.com/docs/api-key-authentication)
5. In Cloudflare **Workers & Pages → flyingstars-site → Settings → Variables and Secrets → Add** öffnen. Für **Production** folgende Werte setzen:

   | Name | Wert | Art |
   |---|---|---|
   | `BREVO_API_KEY` | Erzeugter Brevo-Schlüssel | Verschlüsseltes Secret |
   | `CONTACT_FROM` | Verifizierte Absenderadresse | Variable |
   | `CONTACT_TO` | Postfach für eingehende Anfragen | Variable |
   | `SITE_NAME` | `Flying Stars` | Variable |

   Für Preview separat konfigurieren und ein Testpostfach als Empfänger verwenden, falls dort echter Versand gewünscht ist. Danach neu deployen. Die Werte müssen vor dem Deployment gesetzt sein, das sie verwendet. Eine lokale `.env` konfiguriert den Cloudflare-Produktionsbetrieb nicht automatisch. [Cloudflare-Bindings](https://developers.cloudflare.com/pages/functions/bindings/)
6. Das veröffentlichte Formular mit einer eindeutig als Test bezeichneten Nachricht abschicken. Eingang im Empfängerpostfach und eine Antwort an die anfragende Adresse prüfen. Ohne `BREVO_API_KEY`, `CONTACT_FROM` oder `CONTACT_TO` versendet die Function nichts und meldet `not-configured`.
7. Falls Brevo die Transaktionsplattform als deaktiviert meldet, über den Support im Brevo-Konto die Aktivierung des Transaktionsversands beantragen. [Brevo-Fehlerbehebung](https://help.brevo.com/hc/en-us/articles/115000188150-Troubleshooting-Issues-with-Brevo-SMTP)

`functions/api/contact.ts` liest diese Werte aus der Cloudflare-Laufzeit. Für lokale Tests kann Wrangler sie aus einer ignorierten `.env` oder `.dev.vars` laden. Beide Dateien nicht gleichzeitig verwenden und niemals committen. `TURNSTILE_SECRET` ist optional und setzt voraus, dass das Formular auch ein passendes Turnstile-Token liefert. [Lokale Secrets](https://developers.cloudflare.com/pages/functions/bindings/#local-development-with-secrets)

## Claude-OAuth und das Restrisiko

Der bestehende Agent-Workflow nutzt `CLAUDE_CODE_OAUTH_TOKEN` als GitHub-Actions-Secret. Anthropic unterstützt diesen Weg offiziell. Ein mit `claude setup-token` erzeugter Token verwendet das Abo der Person, die ihn erzeugt. Für mehrere Kundenrepos empfiehlt Anthropic API-Authentifizierung. [Claude GitHub Actions](https://code.claude.com/docs/en/github-actions)

Das Restrisiko ist real. GitHub verschlüsselt Secrets bei der Speicherung. Während eines freigegebenen Laufs muss die Action den verwendeten Token lesen können. Eine kompromittierte Action, Abhängigkeit oder Runner-Umgebung kann dann ebenfalls an ihn gelangen. Die Maskierung von Logs verhindert absichtliches Auslesen oder Versenden nicht. Eine eigene GitHub-Bot-Identität ändert diese Eigenschaft des Claude-Tokens nicht. [GitHub erklärt kompromittierte Runner](https://docs.github.com/en/actions/concepts/security/compromised-runners)

Der Workflow prüft vor dem Claude-Start die Schreibrechte des ursprünglichen und erneuten Auslösers. Die Claude-Action ist auf einen konkreten Commit festgelegt. Vor dem Öffnen eines PR prüft ein Skript aus dem vertrauenswürdigen Start-Commit den Diff auf freigegebene Dateipfade. Diese Kontrollen isolieren den Agent-Prozess nicht von seinen Laufzeit-Secrets.

Deshalb Zugangsdaten auf ihren Einsatzzweck begrenzen, freigegebene Workflows prüfen und verdächtige Tokens widerrufen beziehungsweise ersetzen. Eine lokale `.env` ist eine Klartextdatei, kein verschlüsselter Tresor. Bestehende Claude- oder Codex-Anmeldedaten werden nicht aus lokalen Credential-Dateien kopiert. Zugangsdaten für CI werden gezielt über den vorgesehenen Anbieterweg eingerichtet.

## Codex ergänzen

Codex passt als weitere Engine zum Issue-zu-PR-Ablauf. Ob es für diese Website schneller oder günstiger ist, sollte ein isolierter Vergleich mit denselben Aufgaben, Qualitätsprüfungen, Laufzeiten und Kosten zeigen. Ein zweiter Agent ist keine Voraussetzung für die Veröffentlichung von Inhalten.

Für gewöhnliche CI empfiehlt OpenAI API-Authentifizierung. Die offizielle Codex Action verwendet `OPENAI_API_KEY`; diese Nutzung wird separat vom ChatGPT-Abo über die API abgerechnet. [Codex GitHub Action](https://learn.chatgpt.com/docs/github-action), [Authentifizierung](https://learn.chatgpt.com/docs/auth)

OpenAI dokumentiert außerdem einen fortgeschrittenen Weg mit ChatGPT-Anmeldung für vertrauenswürdige private CI. Dafür muss die von Codex aktualisierte `auth.json` sicher zwischen Läufen erhalten bleiben und ihre Nutzung serialisiert werden. Ein einmal kopierter OAuth-Token reicht dafür nicht dauerhaft. Dieselbe Session darf nicht parallel zwischen lokalen Geräten und CI geteilt werden. API-Authentifizierung bleibt die Empfehlung für die meisten CI-Aufgaben. [Codex-Kontoauthentifizierung in CI](https://learn.chatgpt.com/docs/auth/ci-cd-auth)

Für dieses Projekt den unterstützten Claude-Weg zunächst beibehalten. Codex anschließend getrennt testen und erst nach dem Vergleich als auswählbare Engine integrieren. Dafür einen eigenen, passenden CI-Zugang einrichten, statt die lokale Codex-Session zu exportieren.

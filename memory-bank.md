# Axians Cost Dashboard — Memory Bank

## Project
- Path: /Users/zama/Desktop/Coding/Axians/Axians DevSecOps
- App name: Axians Cost Dashboard
- Environment ID: b77ce512-615d-ec27-a2b1-f8cc441af254
- Subscription ID (cost scope): 99495075-933b-466d-bb21-0e0a44fbe606
- App ID: e73224df-e55c-4479-aaa4-a7d12efb2b00
- App URL: https://apps.powerapps.com/play/e/b77ce512-615d-ec27-a2b1-f8cc441af254/app/e73224df-e55c-4479-aaa4-a7d12efb2b00
- Tenant: c449172f-2144-4c79-8fb9-9ff4682ac14f

## Scope
Dashboard costi Pay-as-you-go: Power Platform AI Builder / Copilot credits + modelli Azure AI Foundry.
UI italiano, single subscription, viste mensile e annuale. Tema Axians (rosso #E2001A + charcoal/bianco).

## Data architecture
- Fonte: Azure Cost Management Query API via custom connector OAuth delegated (utente ha Cost Management Reader).
- UI disaccoppiata tramite CostDataProvider interface. MockCostProvider per dev/preview; adapter connettore per dati reali.
- Bucket mapping: Power Platform (ServiceName ~ Power Platform; MeterCategory AI Builder / Copilot Studio) vs AI Foundry (Cognitive Services / Azure OpenAI, per modello).

## Completed Steps
- [x] Step 1: Prereqs (Node v25.9.0, Git 2.53.0)
- [x] Step 4: Scaffold (degit vite template) + npm install
- [x] Step 5: Init (power.config.json)
- [x] Step 6: Baseline deploy (app URL sopra)
- [x] Step 7: Add data source — connettore standard **HTTP with Microsoft Entra ID** (shared_webcontents), connection ID 5d1383757e004139948f89dda4b89488. NIENTE app registration/secret: identità delegata utente (Cost Management Reader).
- [x] Step 8: Implement app — UI completa + data layer (provider LIVE attivo via InvokeHttp)
- [x] Step 9: Final deploy — live con dati reali

## Last deploy
- 2026-08-03 — eliminati i 429 durante la navigazione: una query condivisa per anno, settimane on demand, `ClientType` e limite richieste/minuto. App URL invariato.

## Fix numerici (2026-08-03)
- Query trend/YTD ora raggruppano anche per **ServiceName**: prima i costi classificati solo da quel campo (Cognitive Services / Azure OpenAI) sparivano da delta KPI, grafico andamento, confronto mensile e budget.
- Aggiunta paginazione `nextLink` (`queryAll` in azureCostProvider.ts): senza, YTD e trend erano troncati a ~1000 righe.
- Finestra trend calcolata dal mese **selezionato** (`shiftMonth`/`monthsBetween`), non da oggi: prima crashava sui mesi oltre i 6 indietro.
- Voci duplicate della tabella dettaglio aggregate per bucket+categoria+nome (la query raggruppa anche per resource group).
- Importi non arrotondati nel modello (arrotondamento solo nei formatter): la card settimanale ora quadra con la KPI "Totale mese".
- Aggiunta aggregazione `UsageQuantity` (colonna Quantità prima sempre "—"). **Se la query dovesse fallire, sospettare questa**: rimuovere `costAndQuantityAggregation` in src/data/costQueries.ts.
- Una sola query "span" alimenta trend + YTD (3 query invece di 4); il mese di riferimento è sovrascritto con i totali del breakdown.

## Ottimizzazione 429 (2026-08-03)
- Una risposta mensile dettagliata per anno alimenta KPI, trend, YTD e dettaglio di tutti i mesi: visitare i 12 mesi disponibili esegue al massimo una query per anno.
- Il dettaglio giornaliero viene caricato solo con "Mostra costi settimanali" e ha una cache dedicata.
- I periodi oltre 31 giorni usano granularità `Monthly`, riducendo righe e QPU.
- Cache browser persistente: 4 ore per mese/anno corrente, 24 ore per periodi storici; richieste simultanee allo stesso periodo vengono aggregate.
- Header `ClientType: AxiansCostDashboard`; limiter client a 4 richieste/minuto e sulle soglie QPU Cost Management: 12/10 secondi, 60/minuto, 600/ora.
- Retry 429 ridotti a massimo 3; usa `Retry-After` quando disponibile e 60 secondi come fallback del connettore.

## Connettore / dati reali
- Service generato: src/generated/services/HTTPwithMicrosoftEntraID_preauthorized_Service.ts (InvokeHttp).
- Wiring: src/data/index.ts -> createAzureCostProvider(liveQueryFn). USE_LIVE_DATA=true. Retry+backoff su 429.
- Query: POST https://management.azure.com/subscriptions/99495075.../providers/Microsoft.CostManagement/query?api-version=2023-11-01
- Classificazione bucket (src/data/costMapping.ts): AI Foundry = costi nel resource group **rg-ai-operations** (match 'ai-operations'); Power Platform = AI Builder / Copilot; fallback su ServiceName/MeterCategory.
- Query raggruppano per ResourceGroupName + ServiceName + MeterCategory (+Meter per breakdown).
- Tema: magenta #E6007E (Power Platform) + blu #1D3B8A (AI Foundry), logo Axians ufficiale in header.
- Badge 'Dati dimostrativi' rimosso. Pannello diagnostico rimosso (deploy finale pulito).
- Per tornare a demo: USE_LIVE_DATA=false in src/data/index.ts.

## Notes / gotchas
- npm: usare `npm_config_cache="$TMPDIR/npm-cache"` (il ~/.npm ha file root-owned).
- degit/npm richiedono esecuzione unsandboxed (cache in ~/Library/Caches) + network.
- Path del progetto contiene uno spazio.

# Lita: análisis bimonetario (flujo y patrimonio)

La consulta `lita:forecast:request` desde **Transacciones**, con usuario autenticado y montos visibles, entrega agregados separados ARS/USD de los últimos seis meses calendario completos.

## Ingresos en USD aunque no existan suficientes gastos USD

Anteriormente, un ingreso en USD sólo se mostraba si también había tres meses con gastos en USD, porque el cálculo de ahorro depende de meses comparables. Ahora cada `currencies[ARS|USD].incomeObserved` incluye:

- `observedIncomeMonths`, `missingIncomeMonths` y `totalLastSixMonths` (registros efectivamente cargados).
- `baseMonthly`: media ponderada de los últimos tres meses con **ingreso** observado, sólo si existen al menos tres meses.
- `possibleMonthlySavings` conserva la regla estricta original: sólo se calcula cuando hay gastos observados e ingresos del mismo conjunto de tres meses. **No inferir ahorro si hay ingresos USD pero gasto USD no registrado.**

El signo negativo en ARS es **brecha de caja en pesos**, no un déficit global del usuario: puede existir ingreso o stock USD, pero una cotización de conversión y los flujos efectivamente destinados a cubrir ARS no se infieren de saldo bancario ni de inversiones.

## Activos registrados en Portfolio

El host lee (con las reglas Firestore del propietario) hasta 250 posiciones de `users/{uid}/portfolioPositions` y adjunta sólo `portfolioBalances`: sumas agregadas de `balance` por moneda, sin nombres, IDs, números de cuenta ni tasas. Si hay más de 250 posiciones, lectura denegada o valores no válidos, se informa `too-many`/`unavailable`, **no** totales parciales.

`byCurrency.USD.balance` es **saldo de posiciones registradas**, no flujo de ahorro mensual, dinero necesariamente líquido ni saldo verificado por el banco. Puede incluir FCI, plazos fijos u otras inversiones. Nunca sumarlo a cuentas de Bancos que podrían representar los mismos activos.

El bridge sólo transmite estos agregados bajo las validaciones actuales de iframe, origen, sesión y modo privacidad. No hay escrituras nuevas ni transferencia a proveedores de IA en la respuesta determinista.

## Pruebas

`src/utils/litaSpendingForecast.test.js` prueba sueldos USD con menos de tres meses de gastos USD y exclusión de compraventas de divisas. `src/utils/litaPortfolioBalances.test.js` prueba valores válidos, sumas sin tipo de cambio, posiciones inválidas y distinción patrimonio/ingreso.

La aplicación Lita debe desplegarse después del host LTC para consumir los nuevos campos. Los clientes anteriores siguen siendo compatibles.

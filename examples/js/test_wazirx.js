"use strict";

// ----------------------------------------------------------------------------

const ccxt = require ('../../ccxt.js')
    , log  = require ('ololog')
    , asTable = require ('as-table').configure ({ delimiter: ' | ' })

// ----------------------------------------------------------------------------

;(async () => {

    const exchange = new ccxt.coinbasepro ({
        'verbose': process.argv.includes ('--verbose'),
        'timeout': 60000,
    })

    console.log(exchange.id)

    try {
        await exchange.loadMarkets()

        const address = await exchange.fetchDepositAddress ('BNTX')
        

        console.log(address)
    } catch (e) {
        console.log(e)
    }

}) ()

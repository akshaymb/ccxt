"use strict";

const asTable   = require ('as-table')
    , log       = require ('ololog').noLocate
    , ansi      = require ('ansicolor').nice
    , ccxt      = require ('../../ccxt.js')

const allExchanges = {};

let computeRate = (orderBook, action, amount) => {
    let currAmount = 0;
    let quantity = 0;
    let currOrders;
    if (action == 'BUY') {
        currOrders = orderBook.asks
    } else {
        currOrders = orderBook.bids
    }

    for (var i = 0; i < currOrders.length; i++) { 
        currAmount += currOrders[i][0] * currOrders[i][1]
        quantity += currOrders[i][1]
        if(currAmount > amount) {
            //console.log(currAmount + ' ' + quantity + ' ' + (currAmount/quantity))
            return (currAmount/quantity)
        }
    }
    // log.red (' Not enough volume ') 
    return 0;
}

let fetchUSDTRate = async (exchange, baseCurrency, limit) => {
    let rate = 1;
    if (baseCurrency == 'INR') {
        let market = 'USDT/' + baseCurrency;
        try {
            const usdtOrderBook = await exchange.fetchOrderBook (market);
            rate = computeRate (usdtOrderBook, 'SELL', limit);
        } catch (e) {
            console.log(e);
        }
    }

    return rate;
}

let findTradeMarkets = async (exchangeId, baseCurrency, orderLimit) => {
    let exchange = new ccxt[exchangeId];
    const usdtRateInBaseCurrency = await fetchUSDTRate(exchange, baseCurrency, orderLimit);
    await exchange.loadMarkets ()
    let promises = [];
    for (let market in exchange.markets) {
        
        // console.log (bitbns.id, symbol)
        let split = market.split('/')
        if (split[1] == baseCurrency) {
            try { 
                //console.log(JSON.stringify(ticker))
                
                const orderBook = await exchange.fetchOrderBook (market)
                let effectiveBuyRate = computeRate (orderBook, 'BUY', 100000)
                let effectiveSellRate = computeRate (orderBook, 'SELL', 100000)
                let promise =  calculateProfit(split[0], exchangeId, 'USDT', effectiveSellRate/usdtRateInBaseCurrency, effectiveBuyRate/usdtRateInBaseCurrency);
                promises.push(promise);

            } catch (e) { 
                log.red ('Could not market', market, 'ticker from', exchange.id + ':', e.constructor.name, e.message)
            }
        }
        for (let promise in promises) {
            await promise
        }
    }
}

let printRatio = async () => {
    log.red('========================================================\n\n')

    //const allExchanges = await loadAllExchanges();

    // instantiate the exchange by id
    let bitbns = new ccxt['bitbns'] ()

    log.green ('Rate limit:', bitbns.rateLimit.toString ().bright)

    // load all markets from the exchange
    let markets = await bitbns.loadMarkets ()

    let coins = {}
    
    const rate = await bitbns.fetchOrderBook ('USDT/INR');
    let usdtRate = rate (usdtOrderBook, 'BUY', 100000)
    console.log(usdtRate);
    let promises = [];
    for (let symbol in bitbns.markets) {
        
        // console.log (bitbns.id, symbol)
        let split = symbol.split('/')
        
        if (split[1] == 'INR') {
        // add error/exception handling as required by the Manual:
        // https://github.com/ccxt/ccxt/wiki/Manual#error-handling

            try { 
                
                //console.log(JSON.stringify(ticker))
                if(coins[split[0]] == undefined)
                    coins[split[0]] = {}
                
                const orderBook = await bitbns.fetchOrderBook (symbol)
                let effectiveBuyRate = rate (orderBook, 'BUY', 200000)
                if (effectiveBuyRate > 0) {
                    coins[split[0]]['inr_buy'] = effectiveBuyRate/usdtRate
                }
                let effectiveSellRate = rate (orderBook, 'SELL', 200000)
                if (effectiveSellRate > 0) {
                    coins[split[0]]['inr_sell'] = effectiveSellRate/usdtRate
                }

                let promise =  calculateProfit(allExchanges, split[0], 'USDT', effectiveSellRate/usdtRate, effectiveBuyRate/usdtRate);
                promises.push(promise);

            } catch (e) { 
                // console.log(e)
                log.red ('Could not fetch', symbol, 'ticker from', bitbns.id + ':', e.constructor.name, e.message)

            }
        } else if (split[1] == 'USDT') {
            try { 
                if(coins[split[0]] == undefined)
                    coins[split[0]] = {}
                const orderBook = await bitbns.fetchOrderBook (symbol)
                let effectiveRate = rate (orderBook, 'BUY', 1000)
                if (effectiveRate > 0) {
                    if (effectiveRate > 0) {
                        let inr_sell = coins[split[0]]['inr_sell'];
                        if(inr_sell) {
                            //console.log("Computing profit sell " +  effectiveRate + " " + inr_sell)
                            let profit = (inr_sell-effectiveRate) / effectiveRate
                            if (profit > 0) {
                                log.yellow ("Profit on " + exchange.id + " with coin " +  split[0] + " sell in India at " + inr_sell + " buy at " + effectiveRate + " Profit " + profit); 
                            }
                        }
                        coins[split[0]]['usdt_buy'] = effectiveRate
                    }
                }
                effectiveRate = rate (orderBook, 'SELL', 1000)
                if (effectiveRate > 0) {
                    if (effectiveRate > 0) {
                        let inr_buy = coins[split[0]]['inr_buy'];
                        if(inr_buy) {
                            //console.log("Computing profit sell " +  inr_buy + " " +  effectiveRate)
                            let profit =  (effectiveRate - inr_buy)/ inr_buy
                            if (profit > 0) {
                                log.yellow ("Profit on " + exchange.id + " with coin " +  split[0] + " sell in US at " + effectiveRate + " buy at " + inr_buy + " Profit " + profit); 
                            }
                        }
                    }
                    coins[split[0]]['usdt_sell'] = effectiveRate
                }
            } catch (e) { // catch the error (if any) and handle it or ignore it
                log.red ('Could not fetch', symbol, 'ticker from', bitbns.id + ':', e.constructor.name, e.message)
            }
        }

        for (let promise in promises) {
            await promise
        }
        // try {
        //     let address = await bitbns.fetchDepositAddress(split[0])
        //     console.log("Address for Bitbns " + address.address + " " + address.tag + " for " + symbol);
        // } catch (e) {
        //     console.log(e)
        //     console.log(symbol)
        // }
    }
}

async function loadAllExchanges() {
    let i = 0;
    let promises = [];
    for (let exchangeId of ccxt.exchanges) {
        let exchange = new ccxt[exchangeId] ()
        try {
            await exchange.loadMarkets ()
            allExchanges[exchangeId] = exchange
        } catch (e) {
            console.log(e);
            log.red ('Could not load markets from', exchange.id + ':', e.constructor.name)
            continue; // skip this exchange if markets failed to load
        }
    }
    // for (let promise in promises) {
    //     try {
    //         await promise;    
    //     } catch (e) {
    //         continue;
    //     }
    // }
}

const orderBooks = {};

async function computeRate1 (exchangeId, symbol, action, amount) {
    try {
        const exchange = allExchanges[exchangeId];
        if( orderBooks[exchangeId] == undefined ) {
            orderBooks[exchangeId] = {}
        }
        if( orderBooks[exchangeId][symbol] == undefined ) {
            orderBooks[exchangeId][symbol] = exchange.fetchOrderBook (symbol)
        }
    
        const orderBook = await orderBooks[exchangeId][symbol]
        let effectiveRate = computeRate (orderBook, action, amount)
        return effectiveRate;
    } catch (e) {
       // console.log(e)
        return 0;
    }
}

async function calculateProfit (baseSymbol, baseExchangeId, baseCurrency, sell_rate, buy_rate) {
    var maxSell = 0;
    var maxBuy = 0;
    for (let exchangeId in allExchanges) {
        const exchange = allExchanges[exchangeId];
        const symbol = baseSymbol + '/' + baseCurrency;

        try {
            //const orderBook = await exchange.fetchOrderBook (symbol)
            //let effectiveRate = computeRate (orderBook, 'BUY', 1000)
            let effectiveRate = await computeRate1(exchangeId, symbol, 'BUY', 1000)
            if (effectiveRate > 0) {
                if(sell_rate) {
                    //console.log("Computing profit sell " +  effectiveRate + " " + inr_sell)
                    let profit = sell_rate / effectiveRate
                    if (profit > 1.02 && profit < 5) {
                        log.green ("For " + baseExchangeId + " Profit on " + exchange.id + " with coin " +  baseSymbol + " sell in India at " + sell_rate + " buy at " + effectiveRate + " Profit " + profit); 
                    }
                    if(profit > maxSell && profit < 5)
                        maxSell = profit;
                    
                }
            }
            effectiveRate = await computeRate1(exchangeId, symbol, 'SELL', 1000)
            if (effectiveRate > 0) {
                if(buy_rate) {
                    let profit =  effectiveRate/ buy_rate
                    if (profit > 1.02 && profit < 5) {
                        log.cyan ("For " + baseExchangeId + " Profit on " + exchange.id + " with coin " +  baseSymbol + " sell in US at " + effectiveRate + " buy at " + buy_rate + " Profit " + profit); 
                    }
                    if(profit > maxBuy && profit < 5)
                        maxBuy = profit;
                }
            }
        } catch (e) { // catch the error (if any) and handle it or ignore it
             //console.log(e)   
             //https://wiki.labcollab.net/confluence/display/Doppler/UWP+AVS-SDK+Changelog.red ('Could not fetch', symbol, 'ticker from', exchange.id)

        }
    }
    // if(maxBuy > 0 || maxSell > 0) {
    //     log.bgDarkGray("Max profit US to India " + maxSell + " " + baseSymbol)
    //     log.bgDarkGray("Max profit India to US " + maxBuy + " " + baseSymbol)
    // }
}

function printTime() {
    var currentdate = new Date(); 
    var datetime = "Last Run: " + currentdate.getDate() + "/"
                + (currentdate.getMonth()+1)  + "/" 
                + currentdate.getFullYear() + " @ "  
                + currentdate.getHours() + ":"  
                + currentdate.getMinutes() + ":" 
                + currentdate.getSeconds();
    console.log(datetime)
}

;(async () => {
    await loadAllExchanges();
    //await printRatio()
    let bitbnsPromise =  findTradeMarkets('bitbns', 'INR', 100000)
    let wazirxPromise =  findTradeMarkets('wazirx', 'INR', 100000)
    let coindcxPromise =  findTradeMarkets('coindcx', 'INR', 100000)
    let buyucoinPromise =  findTradeMarkets('buyucoin', 'INR', 100000)
    await bitbnsPromise
    await wazirxPromise
    await coindcxPromise
    await buyucoinPromise
    printTime()
    process.exit()

}) ()
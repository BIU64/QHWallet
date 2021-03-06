import { BN } from 'ethereumjs-util'
import { renderFromWei, weiToFiat, toWei } from './number'
import TransactionTypes from '../modules/metamask/core/TransactionTypes'
import { strings } from '../locales/i18n'

/**
 * Calculates wei value of estimate gas price in gwei
 *
 * @param {number} estimate - Number corresponding to api gas price estimation
 * @returns {Object} - BN instance containing gas price in wei
 */
export function apiEstimateModifiedToWEI(estimate) {
  return toWei(estimate, 'gwei')
}

/**
 * Calculates GWEI value of estimate gas price from ethgasstation.info
 *
 * @param {number} val - Number corresponding to api gas price estimation
 * @returns {string} - The GWEI value as a string
 */
export function convertApiValueToGWEI(val) {
  return (parseInt(val, 10) / 10).toString()
}

/**
 * Calculates gas fee in wei
 *
 * @param {number} estimate - Number corresponding to api gas price estimation
 * @param {number} gasLimit - Number corresponding to transaction gas limit
 * @returns {Object} - BN instance containing gas price in wei
 */
export function getWeiGasFee(estimate, gasLimit = 21000) {
  const apiEstimate = apiEstimateModifiedToWEI(estimate)
  const gasFee = apiEstimate.mul(new BN(gasLimit, 10))
  return gasFee
}

/**
 * Calculates gas fee in eth
 *
 * @param {number} estimate - Number corresponding to api gas price estimation
 * @param {number} gasLimit - Number corresponding to transaction gas limit
 * @returns {Object} - BN instance containing gas price in wei
 */
export function getRenderableEthGasFee(estimate, gasLimit = 21000) {
  const gasFee = getWeiGasFee(estimate, gasLimit)
  return renderFromWei(gasFee)
}

/**
 * Calculates gas fee in fiat
 *
 * @param {number} estimate - Number corresponding to api gas price estimation
 * @param {number} conversionRate - Number corresponding to conversion rate for current `currencyCode`
 * @param {string} currencyCode - String corresponding to code of current currency
 * @param {number} gasLimit - Number corresponding to transaction gas limit
 * @returns {Object} - BN instance containing gas price in wei
 */
export function getRenderableFiatGasFee(estimate, conversionRate, currencyCode, gasLimit = 21000) {
  const wei = getWeiGasFee(estimate, gasLimit)
  return weiToFiat(wei, conversionRate, currencyCode)
}

/**
 * Parse minutes number to readable wait time
 *
 * @param {number} min - Minutes
 * @returns {string} - Readable wait time
 */
export function parseWaitTime(min) {
  let tempMin = min,
    parsed = '',
    val
  const timeUnits = [[strings('unit.week'), 10080], [strings('unit.day'), 1440], [strings('unit.hour'), 60], [strings('unit.minute'), 1]]
  timeUnits.forEach(unit => {
    if (parsed.includes(' ')) return
    val = Math.floor(tempMin / unit[1])
    if (val) {
      if (parsed !== '') parsed += ' '
      parsed += `${val}${unit[0]}`
    }
    tempMin = min % unit[1]
  })
  if (parsed === '') {
    val = (Math.round(tempMin * 100) * 3) / 5
    if (val) {
      parsed += ` ${Math.ceil(val)}${strings('unit.second')}`
    }
  }
  return parsed.trim()
}

/**
 * Fetches gas estimated from gas station
 *
 * @returns {Object} - Object containing basic estimates
 */
export async function fetchBasicGasEstimates() {
  return await fetch('https://ethgasstation.info/json/ethgasAPI.json', {
    headers: {},
    referrer: 'http://ethgasstation.info/json/',
    referrerPolicy: 'no-referrer-when-downgrade',
    body: null,
    method: 'GET',
    mode: 'cors',
  })
    .then(r => r.json())
    .then(({ average, avgWait, block_time: blockTime, blockNum, fast, fastest, fastestWait, fastWait, safeLow, safeLowWait, speed }) => {
      const basicEstimates = {
        average,
        averageWait: avgWait,
        blockTime,
        blockNum,
        fast,
        fastest,
        fastestWait,
        fastWait,
        safeLow,
        safeLowWait,
        speed,
      }
      return basicEstimates
    })
}

/**
 * Sanitize gas estimates into formatted wait times
 *
 * @returns {Object} - Object containing formatted wait times
 */
export async function getBasicGasEstimates() {
  const {
    CUSTOM_GAS: { AVERAGE_GAS, FAST_GAS, LOW_GAS },
  } = TransactionTypes

  let basicGasEstimates
  try {
    basicGasEstimates = await fetchBasicGasEstimates()
  } catch (error) {
    console.log('Error while trying to get gas limit estimates', error)
    basicGasEstimates = {
      average: AVERAGE_GAS,
      averageWait: 2,
      safeLow: LOW_GAS,
      safeLowWait: 4,
      fast: FAST_GAS,
      fastWait: 1,
    }
  }

  // Handle api failure returning same gas prices
  let { average, fast, safeLow } = basicGasEstimates
  const { averageWait, fastWait, safeLowWait } = basicGasEstimates

  if (average === fast && average === safeLow) {
    average = AVERAGE_GAS
    safeLow = LOW_GAS
    fast = FAST_GAS
  }

  return {
    averageGwei: convertApiValueToGWEI(average),
    fastGwei: convertApiValueToGWEI(fast),
    safeLowGwei: convertApiValueToGWEI(safeLow),
    averageWait: parseWaitTime(averageWait),
    fastWait: parseWaitTime(fastWait),
    safeLowWait: parseWaitTime(safeLowWait),
  }
}

import React, {
  useState,
  ReactElement,
  createContext,
  useContext,
  ReactNode
} from 'react'
import { fetchData } from '@utils/fetch'
import useSWR from 'swr'
import { useSiteMetadata } from '@hooks/useSiteMetadata'
import { LoggerInstance } from '@oceanprotocol/lib'

interface Prices {
  [key: string]: number
}

interface PricesValue {
  prices: Prices
}

const initialData: Prices = {
  eur: 0.0,
  usd: 0.0,
  eth: 0.0,
  btc: 0.0
}

const refreshInterval = 120000 // 120 sec.

const PricesContext = createContext(null)

export default function PricesProvider({
  children
}: {
  children: ReactNode
}): ReactElement {
  const { appConfig } = useSiteMetadata()
  const tokenId = 'ocean-protocol'
  const currencies = appConfig.currencies.join(',') // comma-separated list
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${tokenId}&vs_currencies=${currencies}`
  const urlMatic = `https://api.coingecko.com/api/v3/coins/matic-network`

  const [prices, setPrices] = useState(initialData)

  const onSuccess = async (data: { [tokenId]: Prices }) => {
    if (!data) return
    LoggerInstance.log('[prices] Got new OCEAN spot prices.', data[tokenId])
    // Fetch MATIC prices periodically with swr
    const dataMatic = await fetchData(urlMatic)
    const maticPrice = prices.eur / dataMatic.market_data.current_price.eur // price of Ocean in EUR / price of Matic in EUR
    LoggerInstance.log('[prices] Got new OCEAN spot prices for Matic.')
    setPrices({ ...data[tokenId], matic: maticPrice })
  }

  // Fetch new prices periodically with swr
  useSWR(url, fetchData, {
    refreshInterval,
    onSuccess
  })

  return (
    <PricesContext.Provider value={{ prices }}>
      {children}
    </PricesContext.Provider>
  )
}

// Helper hook to access the provider values
const usePrices = (): PricesValue => useContext(PricesContext)

export { PricesProvider, usePrices }

// Debug utility that only logs in development mode
export const debugLog = (...args: any[]) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(...args)
  }
}

export const debugError = (...args: any[]) => {
  if (process.env.NODE_ENV === 'development') {
    console.error(...args)
  }
}

export const debugWarn = (...args: any[]) => {
  if (process.env.NODE_ENV === 'development') {
    console.warn(...args)
  }
}

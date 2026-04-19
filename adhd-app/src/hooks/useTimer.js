import { useReducer, useEffect, useRef, useCallback } from 'react'
import { useLocalStorage } from './useLocalStorage'

const DEFAULT_SETTINGS = {
  workDuration: 25,
  shortBreak: 5,
  longBreak: 15,
  longBreakInterval: 4,
}

const getModeSeconds = (mode, settings) => {
  if (mode === 'work')       return settings.workDuration * 60
  if (mode === 'shortBreak') return settings.shortBreak * 60
  return settings.longBreak * 60
}

function timerReducer(state, action) {
  switch (action.type) {
    case 'START':
      return { ...state, status: 'running' }
    case 'PAUSE':
      return { ...state, status: 'paused' }
    case 'RESET':
      return {
        ...state,
        status: 'idle',
        secondsLeft: getModeSeconds(state.mode, action.settings),
      }
    case 'TICK':
      return { ...state, secondsLeft: Math.max(0, state.secondsLeft - 1) }
    case 'COMPLETE': {
      const newSessionCount = state.mode === 'work' ? state.sessionCount + 1 : state.sessionCount
      const isLongBreak = state.mode === 'work' && newSessionCount % action.settings.longBreakInterval === 0
      const nextMode = state.mode === 'work'
        ? (isLongBreak ? 'longBreak' : 'shortBreak')
        : 'work'
      return {
        mode: nextMode,
        status: 'idle',
        secondsLeft: getModeSeconds(nextMode, action.settings),
        sessionCount: newSessionCount,
      }
    }
    case 'SET_MODE': {
      return {
        ...state,
        mode: action.mode,
        status: 'idle',
        secondsLeft: getModeSeconds(action.mode, action.settings),
      }
    }
    default:
      return state
  }
}

export function useTimer(onSessionComplete) {
  const [settings, setSettings] = useLocalStorage('adhd_timer_settings', DEFAULT_SETTINGS)
  const [timerState, dispatch] = useReducer(timerReducer, {
    mode: 'work',
    status: 'idle',
    secondsLeft: DEFAULT_SETTINGS.workDuration * 60,
    sessionCount: 0,
  })
  const intervalRef = useRef(null)
  const onCompleteRef = useRef(onSessionComplete)
  onCompleteRef.current = onSessionComplete

  useEffect(() => {
    if (timerState.status === 'running') {
      intervalRef.current = setInterval(() => {
        dispatch({ type: 'TICK' })
      }, 1000)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [timerState.status])

  useEffect(() => {
    if (timerState.status === 'running' && timerState.secondsLeft === 0) {
      if (timerState.mode === 'work') onCompleteRef.current?.()
      dispatch({ type: 'COMPLETE', settings })
    }
  }, [timerState.secondsLeft, timerState.status, timerState.mode, settings])

  const start = useCallback(() => dispatch({ type: 'START' }), [])
  const pause = useCallback(() => dispatch({ type: 'PAUSE' }), [])
  const reset = useCallback(() => dispatch({ type: 'RESET', settings }), [settings])
  const skip  = useCallback(() => dispatch({ type: 'COMPLETE', settings }), [settings])
  const setMode = useCallback((mode) => dispatch({ type: 'SET_MODE', mode, settings }), [settings])
  const updateSettings = useCallback((newSettings) => {
    setSettings(newSettings)
    dispatch({ type: 'RESET', settings: newSettings })
  }, [setSettings])

  const totalSeconds = getModeSeconds(timerState.mode, settings)
  const progress = 1 - timerState.secondsLeft / totalSeconds

  return {
    ...timerState,
    totalSeconds,
    progress,
    settings,
    start,
    pause,
    reset,
    skip,
    setMode,
    updateSettings,
  }
}

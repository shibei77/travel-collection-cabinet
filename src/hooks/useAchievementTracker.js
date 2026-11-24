import { useCallback, useRef, useState } from 'react'
import { achievements, getAchievementStats } from '../data/achievements'

const STORAGE_KEY = 'footprints.travel-collection.achievements.v1'

function readUnlockedAchievementIds() {
  try {
    const savedIds = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(savedIds) ? savedIds : []
  } catch {
    return []
  }
}

function saveUnlockedAchievementIds(ids) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
  } catch {
    // The honor wall can still update for the current session.
  }
}

function getEligibleAchievements(travels) {
  const stats = getAchievementStats(travels)
  return achievements.filter((achievement) => achievement.check(stats))
}

export function useAchievementTracker(initialTravels) {
  const [unlockedIds, setUnlockedIds] = useState(() => {
    const savedIds = readUnlockedAchievementIds()
    const eligibleIds = getEligibleAchievements(initialTravels).map((achievement) => achievement.id)
    const nextIds = [...new Set([...savedIds, ...eligibleIds])]

    if (nextIds.length !== savedIds.length) {
      saveUnlockedAchievementIds(nextIds)
    }

    return nextIds
  })
  const unlockedIdsRef = useRef(unlockedIds)
  const [pendingAchievements, setPendingAchievements] = useState([])

  const evaluateAchievements = useCallback((nextTravels) => {
    const eligibleAchievements = getEligibleAchievements(nextTravels)
    const newlyUnlocked = eligibleAchievements.filter(
      (achievement) => !unlockedIdsRef.current.includes(achievement.id),
    )

    if (newlyUnlocked.length === 0) {
      return
    }

    const nextIds = [...unlockedIdsRef.current, ...newlyUnlocked.map((achievement) => achievement.id)]
    unlockedIdsRef.current = nextIds
    saveUnlockedAchievementIds(nextIds)
    setUnlockedIds(nextIds)
    setPendingAchievements((currentQueue) => [...currentQueue, ...newlyUnlocked])
  }, [])

  const dismissNextAchievement = useCallback(() => {
    setPendingAchievements((currentQueue) => currentQueue.slice(1))
  }, [])

  const resetAchievements = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY)
    } catch {
      // The current view can still be reset when persistent storage is unavailable.
    }

    unlockedIdsRef.current = []
    setUnlockedIds([])
    setPendingAchievements([])
  }, [])

  return {
    dismissNextAchievement,
    evaluateAchievements,
    pendingAchievements,
    resetAchievements,
    unlockedIds,
  }
}

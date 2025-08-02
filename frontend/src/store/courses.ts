import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CourseState, Course, CourseProgress, Lesson } from '@/types';
import { apiClient } from '@/lib/api';

// Helper function to check if user is authenticated
const isAuthenticated = () => {
  if (typeof window === 'undefined') return false;
  
  try {
    // Check if we have auth state in localStorage
    const authStorage = localStorage.getItem('auth-storage');
    if (!authStorage) return false;
    
    const authState = JSON.parse(authStorage);
    return authState?.state?.isAuthenticated === true && !!authState?.state?.tokens;
  } catch {
    return false;
  }
};

interface ExtendedCourseState extends CourseState {
  courseLessons: Record<number, Lesson[]>; // Cache lessons by course ID
  fetchedCourses: Set<number>; // Track which courses have been fetched
  lastFetchTime: Record<string | number, number>; // Track when each course was last fetched
  loadingCourses: Set<number>; // Track which courses are currently being loaded
  loadingLessons: Set<number>; // Track which course lessons are currently being loaded
  fetchCourseLessons: (courseId: number, forceRefresh?: boolean) => Promise<void>;
}

export const useCoursesStore = create<ExtendedCourseState>()(
  persist(
    (set, get) => ({
  courses: [],
  currentCourse: null,
  userProgress: {},
  isLoading: false,
  loading: false,
  courseLessons: {},
  fetchedCourses: new Set(),
  lastFetchTime: {},
  loadingCourses: new Set(),
  loadingLessons: new Set(),

  fetchCourses: async (forceRefresh = false) => {
    console.log('fetchCourses called with forceRefresh:', forceRefresh);
    const { loading, courses } = get();
    const authStatus = isAuthenticated();
    console.log('Current state - loading:', loading, 'courses count:', courses.length, 'authenticated:', authStatus);
    
    // Always fetch on forceRefresh, or if no courses loaded, or to ensure fresh data
    if (loading) {
      console.log('Skipping fetch - already loading');
      return;
    }
    
    // Always fetch fresh data to avoid auth-related caching issues
    if (!forceRefresh && courses.length > 0) {
      console.log('Using cached courses, but will validate auth status');
      // Still proceed to ensure we have the right data for current auth state
    }
    
    console.log('Starting fetch...');
    set({ isLoading: true, loading: true });
    try {
      // Use public endpoint if user is not authenticated
      const courses = isAuthenticated() 
        ? await apiClient.getCourses()
        : await apiClient.getPublicCourses();
      
      let progressMap = {};
      
      // Only fetch progress if user is authenticated and has valid tokens
      const authStatus = isAuthenticated();
      console.log('Auth status check:', authStatus);
      
      if (authStatus) {
        try {
          // Double check that we have access token before making the request
          const authStorage = localStorage.getItem('auth-storage');
          const authState = authStorage ? JSON.parse(authStorage) : null;
          const hasValidToken = authState?.state?.tokens?.access_token;
          
          if (hasValidToken) {
            console.log('Fetching user progress...');
            const progress = await apiClient.getUserProgress();
            progressMap = progress.reduce((acc, p) => {
              acc[p.course_id] = p;
              return acc;
            }, {} as Record<number, CourseProgress>);
            console.log('User progress loaded:', Object.keys(progressMap).length, 'courses');
          } else {
            console.log('No valid token found, skipping progress fetch');
          }
        } catch (progressError) {
          // If progress fetch fails, continue without it
          console.warn('Failed to fetch user progress:', progressError);
        }
      } else {
        console.log('User not authenticated, skipping progress fetch');
      }

      set({
        courses: courses.sort((a, b) => a.id - b.id), // Sort courses by ID
        userProgress: progressMap,
        isLoading: false,
        loading: false,
      });
    } catch (error) {
      set({ isLoading: false, loading: false });
      throw error;
    }
  },

  fetchCourse: async (id: number) => {
    const { fetchedCourses, lastFetchTime, courses, loadingCourses } = get();
    const now = Date.now();
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache
    
    console.log(`[COURSE] Request for course ${id}`);
    
    // Check if course is already being loaded
    if (loadingCourses.has(id)) {
      console.log(`[COURSE] Course ${id} already loading, skipping...`);
      return; // Wait for the existing request to complete
    }
    
    // Check if course is already in store and recently fetched
    const existingCourse = courses.find(c => c.id === id);
    const lastFetch = lastFetchTime[id];
    
    if (existingCourse && lastFetch && (now - lastFetch < CACHE_DURATION)) {
      console.log(`[COURSE] Using cached data for course ${id}`);
      set({ currentCourse: existingCourse });
      return;
    }

    // Mark as loading
    set({ 
      isLoading: true,
      loadingCourses: new Set([...loadingCourses, id])
    });
    
    try {
      console.log(`[COURSE] Making API request for course ${id}`);
      const course = await apiClient.getCourse(id);
      console.log(`[COURSE] Received course data for "${course.title}"`);
      
      // Update course in array if it exists, otherwise add it
      const existingIndex = courses.findIndex(c => c.id === id);
      let updatedCourses;
      
      if (existingIndex >= 0) {
        // Update existing course
        updatedCourses = [...courses];
        updatedCourses[existingIndex] = course;
      } else {
        // Add new course
        updatedCourses = [...courses, course];
      }
      
      set({
        currentCourse: course,
        courses: updatedCourses.sort((a, b) => a.id - b.id), // Keep courses sorted
        isLoading: false,
        fetchedCourses: new Set([...fetchedCourses, id]),
        lastFetchTime: { ...lastFetchTime, [id]: now },
        loadingCourses: new Set([...loadingCourses].filter(courseId => courseId !== id))
      });
    } catch (error) {
      const updatedLoadingCourses = new Set([...loadingCourses]);
      updatedLoadingCourses.delete(id);
      set({ 
        isLoading: false,
        loadingCourses: updatedLoadingCourses
      });
      throw error;
    }
  },

  fetchCourseLessons: async (courseId: number, forceRefresh = false) => {
    const { courseLessons, lastFetchTime, loadingLessons } = get();
    const now = Date.now();
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache
    const cacheKey = `lessons_${courseId}`;
    
    console.log(`[LESSONS] Request for course ${courseId}, forceRefresh: ${forceRefresh}`);
    
    // Check if lessons are already being loaded
    if (loadingLessons.has(courseId)) {
      console.log(`[LESSONS] Course ${courseId} already loading, skipping...`);
      return; // Wait for the existing request to complete
    }
    
    // Check cache
    const cachedLessons = courseLessons[courseId];
    const lastFetch = lastFetchTime[cacheKey];
    
    if (!forceRefresh && cachedLessons && cachedLessons.length > 0 && lastFetch && (now - lastFetch < CACHE_DURATION)) {
      console.log(`[LESSONS] Using cached data for course ${courseId}, ${cachedLessons.length} lessons`);
      return; // Use cached data
    }

    // Mark as loading
    set({
      loadingLessons: new Set([...loadingLessons, courseId])
    });

    try {
      console.log(`[LESSONS] Making API request for course ${courseId} lessons`);
      const lessons = await apiClient.getCourseLessons(courseId);
      console.log(`[LESSONS] Received ${lessons.length} lessons for course ${courseId}`);
      
      set({
        courseLessons: {
          ...courseLessons,
          [courseId]: lessons
        },
        lastFetchTime: {
          ...lastFetchTime,
          [cacheKey]: now
        },
        loadingLessons: new Set([...loadingLessons].filter(id => id !== courseId))
      });
    } catch (error) {
      const updatedLoadingLessons = new Set([...loadingLessons]);
      updatedLoadingLessons.delete(courseId);
      set({
        loadingLessons: updatedLoadingLessons
      });
      console.error('Failed to fetch course lessons:', error);
      throw error;
    }
  },

  deleteCourse: async (id: number) => {
    try {
      await apiClient.deleteCourse(id);
      const { courses, courseLessons, fetchedCourses, lastFetchTime } = get();
      
      // Clean up all related data
      const updatedCourseLessons = { ...courseLessons };
      delete updatedCourseLessons[id];
      
      const updatedFetchedCourses = new Set(fetchedCourses);
      updatedFetchedCourses.delete(id);
      
      const updatedLastFetchTime = { ...lastFetchTime };
      delete updatedLastFetchTime[id];
      delete updatedLastFetchTime[`lessons_${id}`];
      
      set({
        courses: courses.filter(course => course.id !== id),
        courseLessons: updatedCourseLessons,
        fetchedCourses: updatedFetchedCourses,
        lastFetchTime: updatedLastFetchTime,
        currentCourse: get().currentCourse?.id === id ? null : get().currentCourse
      });
    } catch (error) {
      throw error;
    }
  },

  updateProgress: async (courseId: number, lessonId: number, completed: boolean) => {
    try {
      console.log(`Updating progress for lesson ${lessonId} in course ${courseId}: ${completed}`);
      
      // Update lesson progress on server
      await apiClient.updateLessonProgress(lessonId, { completed });
      
      // Refresh course lessons to get updated completion status
      await get().fetchCourseLessons(courseId, true);
      
      // Refresh user progress for all courses
      const progress = await apiClient.getUserProgress();
      const progressMap = progress.reduce((acc, p) => {
        acc[p.course_id] = p;
        return acc;
      }, {} as Record<number, CourseProgress>);

      console.log('Updated progress map:', progressMap);
      set({ userProgress: progressMap });
      
      // Also refresh courses with updated progress data
      await get().fetchCourses(true);
    } catch (error) {
      console.error('Failed to update progress:', error);
      throw error;
    }
  },

  // Функция для очистки кэша
  clearCache: () => {
    set({
      courses: [],
      currentCourse: null,
      userProgress: {},
      courseLessons: {},
      fetchedCourses: new Set(),
      lastFetchTime: {},
      loadingCourses: new Set(),
      loadingLessons: new Set(),
    });
  },
    }),
    {
      name: 'courses-storage',
      partialize: (state) => ({
        courses: state.courses,
        userProgress: state.userProgress,
        courseLessons: state.courseLessons,
        // Не сохраняем Set'ы и временные состояния
      }),
    }
  )
);


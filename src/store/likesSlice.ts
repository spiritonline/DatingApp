import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { collection, query, where, getDocs, Timestamp } from '@firebase/firestore';
import { db } from '../services/firebase';

interface LikeState {
  todayCount: number;
  loading: boolean;
  error: string | null;
}

const initialState: LikeState = {
  todayCount: 0,
  loading: false,
  error: null,
};

// Helper to get start of today
const getStartOfToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

// Async thunk to fetch today's likes count
export const fetchTodayLikes = createAsyncThunk(
  'likes/fetchTodayLikes',
  async (userId: string) => {
    const startOfToday = getStartOfToday();
    const likesRef = collection(db, 'likes');
    const todayLikesQuery = query(
      likesRef,
      where('fromUser', '==', userId),
      where('createdAt', '>=', Timestamp.fromDate(startOfToday))
    );

    const querySnapshot = await getDocs(todayLikesQuery);
    return querySnapshot.size;
  }
);

const likesSlice = createSlice({
  name: 'likes',
  initialState,
  reducers: {
    incrementLikeCount: (state) => {
      state.todayCount += 1;
    },
    resetLikeCount: (state) => {
      state.todayCount = 0;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTodayLikes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTodayLikes.fulfilled, (state, action: PayloadAction<number>) => {
        state.loading = false;
        state.todayCount = action.payload;
      })
      .addCase(fetchTodayLikes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch today\'s likes';
      });
  },
});

export const { incrementLikeCount, resetLikeCount } = likesSlice.actions;
export default likesSlice.reducer;

import {createSlice} from "@reduxjs/toolkit"

export const userSlice = createSlice({
    name: "user",
    initialState: {
        user: null,
    },
    reducers: {
        login: (state, action) => {
            state.user = action.payload;
        },
        logout: (state, action) => {
            state.user = action.payload;
            //input vil ikke funke når man drar tilbake
        }, //kan legge til poengsystem her!
    },
});

export const { login, logout } = userSlice.actions;
export const selectUser = (state) => state.user.user;


export default userSlice.reducer;
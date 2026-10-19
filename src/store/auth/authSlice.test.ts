import type { RootState } from "../index";
import { describe, expect, it } from "vitest";
import reducer, { resetDetails, selectAuthDetails, setDetails } from "./authSlice";

const user = { id: 1, username: "u", name: "N", surname: "S", exp: 0 };

describe("authSlice", () => {
    it("stores and resets the details", () => {
        let state = reducer({ details: null }, setDetails(user));
        expect(selectAuthDetails({ auth: state } as RootState)).toEqual(user);
        state = reducer(state, resetDetails());
        expect(selectAuthDetails({ auth: state } as RootState)).toBeNull();
    });
});

import { describe, expectTypeOf, it } from "vitest";
import type { components } from "./schema";
import type { Chat, Message, Presence, User } from "../types";

type Schemas = components["schemas"];

/* schema.d.ts is generated from the backend's docs/openapi.json (npm run gen:api). What the server sends has to fit
 * the types the app works with, so a renamed or retyped field in a DTO fails the type check here.
 * (`tsc --noEmit` is the actual test; the runtime part below only keeps the file in the test run.) */
describe("types.ts against the backend's DTOs", () => {
    it("accepts what the server sends", () => {
        expectTypeOf<Schemas["UserDto"]>().toExtend<User>();
        expectTypeOf<Schemas["MessageDto"]>().toExtend<Message>();
        expectTypeOf<Schemas["PresenceDto"]>().toExtend<Presence>();
        expectTypeOf<Schemas["ChatDto"]>().toExtend<Omit<Chat, "messages" | "status" | "users">>();
        expectTypeOf<Schemas["ChatDto"]["messages"]>().toExtend<Message[]>();
    });
});

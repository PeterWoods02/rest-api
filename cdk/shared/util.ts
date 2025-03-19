import { marshall } from "@aws-sdk/util-dynamodb";
import { Team } from "./types";

export const generateTeamItem = (team: Team) => {
    return {
        PutRequest: {
            Item: marshall(team),
        },
    };
};

export const generateBatch = (data: Team[]) => {
    return data.map((e) => {
        return generateTeamItem(e);
    });
};
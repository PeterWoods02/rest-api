import { marshall } from "@aws-sdk/util-dynamodb";
import { Team, Player } from "./types";

type Entity = Team | Player; 
export const generateItem = (entity: Entity) => {
    return {
      PutRequest: {
        Item: marshall(entity),
      },
    };
  };
  
  export const generateBatch = (data: Entity[]) => {
    return data.map((e) => {
      return generateItem(e);
    });
  };
  
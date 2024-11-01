import { InterpolationBuffer } from "interpolation-buffer";
import { Player, PlayerState } from "../../../../api/types";
import { HathoraClient, RoomId } from "../../../.hathoraFix/client";
import { DEFAULT_HEIGHT, DEFAULT_WIDTH } from "@/components/Game";

export class LoadScene extends Phaser.Scene {
  private client!: HathoraClient;
  private token!: string;
  private stateId!: RoomId;

  constructor() {
    super("load");
  }

  preload() {
    this.load.image("background", "assets/lobby.png");
  }

  init({ client, token, stateId }: { client: HathoraClient; token: string; stateId: RoomId }) {
    this.client = client;
    this.token = token;
    this.stateId = stateId;
  }

  create() {
    this.add.sprite(0, 0, "background").setOrigin(0, 0).setDisplaySize(DEFAULT_WIDTH, DEFAULT_HEIGHT);
    this.add
      .text(DEFAULT_WIDTH / 2, (DEFAULT_HEIGHT / 3) * 4, "Loading...", {
        fontSize: "50px",
        fontFamily: "futura",
        color: "black",
      })
      .setOrigin(0.5);
    this.client.connect(this.token, this.stateId).then((connection) => {
      const stateBuffer = new InterpolationBuffer(connection.state, 25, lerp);
      this.scene.start("help", {
        user: HathoraClient.getUserFromToken(this.token),
        stateBuffer,
        connection,
        roomId: this.stateId,
      });
      // @ts-ignore
      connection.onUpdate(({ state, events, updatedAt }) => stateBuffer.enqueue(state, events, updatedAt));
    });
  }
}

function lerp(from: PlayerState, to: PlayerState, pctElapsed: number): PlayerState {
  return {
    players: to.players.map((toPlayer) => {
      const fromPlayer = from.players.find((p) => p.id === toPlayer.id);
      return fromPlayer !== undefined ? lerpPlayer(fromPlayer, toPlayer, pctElapsed) : toPlayer;
    }),
    platforms: to.platforms,
    star: to.star,
    startTime: to.startTime,
    finishTime: to.finishTime,
  };
}

function lerpPlayer(from: Player, to: Player, pctElapsed: number): Player {
  return {
    id: from.id,
    x: from.x + (to.x - from.x) * pctElapsed,
    y: from.y + (to.y - from.y) * pctElapsed,
  };
}

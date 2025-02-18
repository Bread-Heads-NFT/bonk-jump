import { HathoraClient } from "../../../.hathoraFix/client";
import InputText from "phaser3-rex-plugins/plugins/inputtext.js";
import { DEFAULT_HEIGHT, DEFAULT_WIDTH } from "@/components/Game";

export class LobbyScene extends Phaser.Scene {
  preload() {
    this.load.image("background", "assets/lobby.png");
  }

  create() {
    this.add.sprite(0, 0, "background").setOrigin(0, 0).setDisplaySize(DEFAULT_WIDTH, DEFAULT_HEIGHT);
    const createButton = this.add
      .text(DEFAULT_WIDTH / 2, DEFAULT_HEIGHT / 4, "Create New Game", {
        fontSize: "20px",
        fontFamily: "futura",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setPadding(10)
      .setStyle({ backgroundColor: "#111" })
      .setInteractive({ useHandCursor: true })
      .on("pointerover", () => createButton.setStyle({ fill: "#f39c12" }))
      .on("pointerout", () => createButton.setStyle({ fill: "#FFF" }))
      .on("pointerdown", async () => {
        const client = new HathoraClient();
        if (sessionStorage.getItem("token") === null) {
          const newToken = await client.loginAnonymous();
          sessionStorage.setItem("token", newToken);
        }

        const token = sessionStorage.getItem("token")!;
        const stateId = await client.create(token);
        this.scene.start("load", { client, token, stateId });
      });

    const joinButton = this.add
      .text(DEFAULT_WIDTH / 2, (DEFAULT_HEIGHT * 3) / 4, "Join Existing Game", {
        fontSize: "20px",
        fontFamily: "futura",
      })
      .setInteractive({ useHandCursor: true })
      .setOrigin(0.5)
      .setPadding(10)
      .setStyle({ backgroundColor: "#111" })
      .setInteractive({ useHandCursor: true })
      .on("pointerover", () => joinButton.setStyle({ fill: "#f39c12" }))
      .on("pointerout", () => joinButton.setStyle({ fill: "#FFF" }))
      .on("pointerdown", async () => {
        const stateId = inputText.text?.trim();
        if (stateId === undefined || stateId === "") {
          alert("Please enter an existing room code or create a new game!");
          return;
        }
        const client = new HathoraClient();
        if (sessionStorage.getItem("token") === null) {
          const newToken = await client.loginAnonymous();
          sessionStorage.setItem("token", newToken);
        }

        const token = sessionStorage.getItem("token")!;
        this.scene.start("load", { client, token, stateId });
      });
    const config: InputText.IConfig = {
      border: 10,
      borderColor: "black",
      backgroundColor: "white",
      placeholder: "Room Code",
      color: "black",
      fontFamily: "futura",
    };
    const inputText = new InputText(this, joinButton.x, joinButton.y - 40, 100, 30, config);
    this.add.existing(inputText);
  }
}

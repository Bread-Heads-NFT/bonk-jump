import { DEFAULT_HEIGHT, DEFAULT_WIDTH } from "@/components/Game";

export class HelpScene extends Phaser.Scene {
  constructor() {
    super("help");
  }

  preload() {
    this.load.image("background", "assets/lobby.png");
  }

  init(args: any) {
    this.input.keyboard?.on("keydown-ENTER", () => this.scene.start("game", args));
    this.input.on("pointerdown", () => this.scene.start("game", args));
  }

  create() {
    this.add.sprite(0, 0, "background").setOrigin(0, 0).setDisplaySize(DEFAULT_WIDTH, DEFAULT_HEIGHT);
    this.add
      .text(
        DEFAULT_WIDTH / 2,
        DEFAULT_HEIGHT / 6,
        `Move around with the arrow keys.
Press space to die and turn into a platform.
Get to the top and collect the star.

Click anywhere to start.`,
        { fontSize: "30px", fontFamily: "futura", color: "black", align: "center" }
      )
      .setOrigin(0.5);
  }
}

import { InterpolationBuffer } from "interpolation-buffer";
import { UserData } from "../../../../api/base";
import { HathoraEvents, Inputs, Platform, Player, PlayerState, Star, UserId, XDirection, YDirection } from "../../../../api/types";
import { HathoraConnection, RoomId } from "../../../.hathoraFix/client";
import { MAP_HEIGHT, MAP_WIDTH, PLATFORM_HEIGHT } from "../../../../shared/constants";
import { DEFAULT_HEIGHT, DEFAULT_WIDTH } from "@/components/Game";
import InputText from "phaser3-rex-plugins/plugins/inputtext";
import { HathoraEventTypes } from "../../../../api/types";

export class GameScene extends Phaser.Scene {
  private user!: UserData;
  private stateBuffer!: InterpolationBuffer<PlayerState>;
  private connection!: HathoraConnection;
  private roomId!: RoomId;

  private players: Map<UserId, Phaser.GameObjects.Sprite> = new Map();
  private platforms: Phaser.GameObjects.TileSprite[] = [];
  private star: Star | undefined;

  private timeElapsedText!: Phaser.GameObjects.Text;
  private gameoverText: Phaser.GameObjects.Text | undefined;
  private startText: Phaser.GameObjects.Text | undefined;
  private fadeOutRectangle: Phaser.GameObjects.Graphics | undefined;
  private respawnText: Phaser.GameObjects.Text | undefined;
  private idleCount = 0;

  constructor() {
    super("game");
  }

  preload() {
    this.load.spritesheet("player", "assets/player.png", { frameWidth: 32, frameHeight: 32 });
    this.load.image("platform", "assets/brick.png");
    this.load.image("star", "assets/star.png");
    this.load.image("gameBackground", "assets/background.png");
    this.load.audio("jump", "assets/jump.mp3");
    this.load.audio("music", "assets/music.ogg");
    this.load.audio("win", "assets/win.mp3");
    this.load.audio("death", "assets/death.mp3");
  }

  init({
    user,
    stateBuffer,
    connection,
    roomId,
  }: {
    user: UserData;
    stateBuffer: InterpolationBuffer<PlayerState>;
    eventsBuffer: string[];
    connection: HathoraConnection;
    roomId: RoomId;
  }) {
    this.user = user;
    this.stateBuffer = stateBuffer;
    this.connection = connection;
    this.roomId = roomId;

    connection.joinGame({});

    const keys = this.input.keyboard!.createCursorKeys();
    let prevInputs: Inputs | undefined;
    function handleKeyEvt() {
      const inputs: Inputs = {
        horizontal: keys.left.isDown ? XDirection.LEFT : keys.right.isDown ? XDirection.RIGHT : XDirection.NONE,
        vertical: keys.up.isDown ? YDirection.UP : keys.down.isDown ? YDirection.DOWN : YDirection.NONE,
      };
      if (prevInputs === undefined || JSON.stringify(inputs) !== JSON.stringify(prevInputs)) {
        connection.setInputs({ inputs });
        prevInputs = inputs;
      }
    }

    this.input.keyboard!.on("keydown-SPACE", () => connection.freeze({}));
    this.input.keyboard!.on("keydown", handleKeyEvt);
    this.input.keyboard!.on("keyup", handleKeyEvt);
  }

  create() {
    this.cameras.main.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);
    this.add.tileSprite(0, 0, MAP_WIDTH, MAP_HEIGHT, "gameBackground").setOrigin(0, 0);
    this.timeElapsedText = this.add.text(0, 0, "", { color: "black", fontFamily: "futura" }).setScrollFactor(0);
    this.timeElapsedText.depth = 100;

    this.sound.play("music", { loop: true, volume: 0.25 });

    this.anims.create({
      key: "idle",
      frames: this.anims.generateFrameNumbers("player", { start: 0, end: 10 }),
      frameRate: 15,
    });
    this.anims.create({
      key: "walk",
      frames: this.anims.generateFrameNumbers("player", { start: 11, end: 22 }),
    });
    this.anims.create({
      key: "jump",
      frames: [{ key: "player", frame: 23 }],
    });
    this.anims.create({
      key: "fall",
      frames: [{ key: "player", frame: 24 }],
    });

    const config: InputText.IConfig = {
      border: 10,
      text: `Room Code: ${this.roomId}`,
      color: "black",
      fontFamily: "futura",
      readOnly: true,
    };
    const inputText = new InputText(this, DEFAULT_WIDTH - 100, 20, 200, 50, config).setScrollFactor(0);
    this.add.existing(inputText);

    const { state } = this.stateBuffer.getInterpolatedState(Date.now());
    if (state.startTime === undefined) {
      this.startText = this.add
        .text(DEFAULT_WIDTH / 2, DEFAULT_HEIGHT / 2, `Click to start (${state.players.length} active players)`, {
          fontSize: "30px",
          fontFamily: "futura",
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setInteractive()
        .on("pointerover", () => this.startText!.setStyle({ fill: "#f39c12" }))
        .on("pointerout", () => this.startText!.setStyle({ fill: "#FFF" }))
        .on("pointerdown", () => this.connection.startGame({}));
    }
  }

  update() {
    const { state, events } = this.stateBuffer.getInterpolatedState(Date.now());
    const hathoraEvents = events as unknown as HathoraEvents[]

    hathoraEvents.forEach((event) => {
      if (event.type === HathoraEventTypes.jump) {
        this.sound.play("jump", { volume: 2 });
      } else if (event.type === HathoraEventTypes.frozen) {
        this.sound.play("death");
        this.fadeOutRectangle = this.add
          .graphics({ fillStyle: { color: 0x000000 } })
          .setAlpha(0)
          .fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
        this.respawnText = this.add
          .text(
            this.cameras.main.midPoint.x,
            this.cameras.main.midPoint.y - DEFAULT_HEIGHT / 4,
            "You died for the cause!\nRespwaning in 5s...",
            { fontSize: "50px", fontStyle: "bold", color: "black", fontFamily: "futura" }
          )
          .setOrigin(0.5);
        this.tweens.add({
          targets: this.fadeOutRectangle,
          alpha: 1,
          duration: 5000,
        });
      } else if (event.type === HathoraEventTypes.respawn) {
        this.fadeOutRectangle?.destroy();
        this.respawnText?.destroy();
      } else if (event.type === HathoraEventTypes.start) {
        this.platforms.forEach((platform) => platform.destroy());
        this.startText?.destroy();
        this.startText = undefined;
        this.gameoverText?.destroy();
        this.gameoverText = undefined;
      } else if (event.type === HathoraEventTypes.finish) {
        this.sound.play("win", { volume: 10 });
        this.gameoverText = this.add
          .text(
            DEFAULT_WIDTH / 2,
            DEFAULT_HEIGHT / 2,
            `You won in ${formatTime(state.finishTime! - state.startTime!)}!`,
            { fontSize: "30px", fontFamily: "futura" }
          )
          .setScrollFactor(0)
          .setOrigin(0.5)
          .setInteractive()
          .on("pointerover", () => this.gameoverText!.setStyle({ fill: "#F39C12" }))
          .on("pointerout", () => this.gameoverText!.setStyle({ fill: "#FFF" }))
          .on("pointerdown", async () => {
            await this.connection.startGame({});
          });
      } else {
        console.error("Unkown event: ", event);
      }
    });

    state.players.forEach((player) => {
      if (!this.players.has(player.id)) {
        this.addPlayer(player);
      } else {
        this.updatePlayer(player);
      }
    });

    if (this.startText !== undefined) {
      this.startText.text = `Click to start (${state.players.length} active players)`;
    }
    state.platforms.forEach((platform) => {
      if (this.platforms.find((p) => p.x === platform.x && p.y === platform.y) === undefined) {
        this.addPlatform(platform);
      }
    });
    if (this.star === undefined) {
      this.star = state.star;
      this.add.sprite(state.star.x, state.star.y, "star").setScale(0.25).setOrigin(0, 0);
    }
    if (state.startTime !== undefined && state.finishTime === undefined) {
      this.timeElapsedText.text = formatTime(Date.now() - state.startTime);
    }
  }

  private addPlayer({ id, x, y }: Player) {
    const sprite = new Phaser.GameObjects.Sprite(this, x, y, "player").setOrigin(0, 0);
    this.add.existing(sprite);
    this.players.set(id, sprite);
    if (id === this.user.id) {
      this.cameras.main.startFollow(sprite);
    }
  }

  private addPlatform({ x, y, width }: Platform) {
    const sprite = new Phaser.GameObjects.TileSprite(this, x, y, width, PLATFORM_HEIGHT, "platform")
      .setTileScale(0.25, 0.25)
      .setOrigin(0, 0);
    this.add.existing(sprite);
    this.platforms.push(sprite);
  }

  private updatePlayer({ id, x, y }: Player) {
    const sprite = this.players.get(id)!;

    if (x < sprite.x) {
      sprite.setFlipX(true);
    } else if (x > sprite.x) {
      sprite.setFlipX(false);
    }

    let idle = false;
    if (y < sprite.y) {
      sprite.anims.play("jump", true);
    } else if (y > sprite.y) {
      sprite.anims.play("fall", true);
    } else if (x !== sprite.x) {
      sprite.anims.play("walk", true);
    } else {
      idle = true;
      if (this.idleCount > 2) {
        sprite.anims.play("idle", true);
      }
    }
    if (idle) {
      this.idleCount++;
    } else {
      this.idleCount = 0;
    }

    sprite.x = x;
    sprite.y = y;
  }
}

function formatTime(ms: number) {
  const seconds = ms / 1000;
  const mStr = Math.floor(seconds / 60).toString();
  const sStr = Math.floor(seconds % 60).toString();
  return `🕰️  ${mStr.padStart(2, "0")}:${sStr.padStart(2, "0")}`;
}
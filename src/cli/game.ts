import { Game } from "../game/game";
import { Player } from "../game/player";
import { Report } from "../game/reports";

export class GameCli extends Game {
    sendPlayerReport(player: Player, report: Report) {
        player.recieveReport(report)
    }
}
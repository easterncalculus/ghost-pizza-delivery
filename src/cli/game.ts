import { Game } from "../game/game";
import { Player } from "../game/player";
import { Report } from "../game/reports";

export class GameCli extends Game {
    async sendPlayerReport(player: Player, report: Report): Promise<void> {
        await player.recieveReport(report)
    }
}
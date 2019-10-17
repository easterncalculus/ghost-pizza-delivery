import { Game } from "../game/game";
import { Report, PlayerReport } from "../game/reports";

export class GameCli extends Game {
    async sendPlayerReport(report: Report) {
        if (report instanceof PlayerReport) {
            await report.player.recieveReport(report)
        } else {
            throw new Error(report.constructor.name)
        }
    }
}
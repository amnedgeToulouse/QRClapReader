export class Utils {
    static ConvertSecondToTimeLeft(duration) {
        var hours = 0;
        var minutes = 0;
        var secondes = 0;
        if (duration > 3600) {
            hours = Math.floor(duration / 3600);
        }
        if (duration > 60) {
            minutes = Math.floor((duration / 3600 - Math.floor(duration / 3600)) * 60);
        }
        secondes = Math.floor(((duration / 3600 - Math.floor(duration / 3600)) * 60 - Math.floor((duration / 3600 - Math.floor(duration / 3600)) * 60)) * 60);
        return `${hours < 10 ? "0" + hours : hours}:${minutes < 10 ? "0" + minutes : minutes}:${secondes < 10 ? "0" + secondes : secondes}`;
    }
}
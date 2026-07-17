import dayjs from 'dayjs';
import 'dayjs/locale/es';
import minMax from 'dayjs/plugin/minMax';

dayjs.extend(minMax);
dayjs.locale('es');

export default dayjs;

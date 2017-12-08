import { SyncedCron } from 'meteor/percolate:synced-cron';

import { Games } from '../../api/games/games.js';
import { Status } from '../../api/games/status.js';

SyncedCron.add({
  name: 'Remove old games from DB',
  schedule(parser) {
    return parser.text('every 1 hour');
  },
  job() {
    Games.remove({ status: { $gte: Status.FINISHED } });
  },
});

SyncedCron.start();

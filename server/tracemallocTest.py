import os
import tracemalloc
from sys import path

path.append("server")

tracemalloc.start(10)

try:
    os.system('python app.py')
except:
    snapshot = tracemalloc.take_snapshot()
    top_stats = snapshot.statistics('lineno')
# snapshot = tracemalloc.take_snapshot()
# top_n(25, snapshot, trace_type='filename')

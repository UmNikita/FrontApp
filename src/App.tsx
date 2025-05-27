import { useEffect, useState, useCallback, useRef, memo } from 'react';
import './style.css'
import NoteComponent from './NoteComponent';
import { FixedSizeList as List, ListOnScrollProps  } from 'react-window';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

const ITEM_HEIGHT = 50;

const Row = memo(({ data, index, style }: any) => {
  const note: any = data.notes[index];
  if (!note) {
    return <div style={style}>Загрузка...</div>;
  }

  return (
    <Draggable draggableId={note.id.toString()} index={index}>
      {(provided) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={{ ...style, ...provided.draggableProps.style }}
        >
          <NoteComponent
            name={note.name}
            checked={note.isChecked}
            onChecked={() => data.toggleNote(note.id, !note.isChecked)}
          />
        </div>
      )}
    </Draggable>
  );
});

function App() {
  const [notes, setNotes] = useState<any[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const checkablesRef = useRef<any[]>([]);
  const [checkables, setCheckables] = useState<any[]>([]);
  const [checkedMap, setCheckedMap] = useState<{ [id: number]: boolean }>({});
  const positionsRef = useRef<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const hasLoaded = useRef(false);
  const loadingRef = useRef(false);
  const [isSearch, setSearch] = useState(false);
  const [searchTxt, setSearchTxt] = useState('');
  const [searchVersion, setSearchVersion] = useState(0);

  const loadMore = useCallback(() => {
  if (loadingRef.current || !hasMore) return;
  loadingRef.current = true;

  const currentOffset = offset;

  const url = isSearch
    ? `https://backapp-xmhk.onrender.com/notes-search?offset=${currentOffset}&search=${encodeURIComponent(searchTxt)}`
    : `https://backapp-xmhk.onrender.com/notes?offset=${currentOffset}`;

  fetch(url)
    .then(response => {
      if (!response.ok) throw new Error('Ошибка сети');
      return response.json();
    })
    .then(data => {
      if (currentOffset === 0) {
        setNotes(data.notes);
      } else {
        setNotes(prev => [...prev, ...data.notes]);
      }
      if (data.notes.length < 20) setHasMore(false);
      setOffset(prev => prev + 20);
    })
    .catch(console.error)
    .finally(() => {
      loadingRef.current = false;
    });
}, [offset, hasMore, isSearch, searchTxt]);

  useEffect(() => {
    checkablesRef.current = checkables;
    positionsRef.current = positions;
  }, [checkables, positions]);

  useEffect(() => {
    if (!hasLoaded.current) {
      hasLoaded.current = true;
      loadMore();
    }

    const interval = setInterval(() => {
      if (!isSearch && (checkablesRef.current.length > 0 || positionsRef.current.length > 0)) {
        fetch(`https://backapp-xmhk.onrender.com/change-notes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            notes_checked: checkablesRef.current,
            notes_position: positionsRef.current
          }),
        })
          .then((response) => {
            if (!response.ok) throw new Error('Ошибка сети');
            return response.json();
          })
          .then((data) => {
            if (data.message === "OK") {
              setCheckables([]);
              setPositions([]);
            }
          });
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isSearch]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (checkablesRef.current.length > 0 || positionsRef.current.length > 0) {
        let notes_checked_value = checkablesRef.current;
        let notes_position_value = searchTxt !== '' ? [] : positionsRef.current;
        fetch(`https://backapp-xmhk.onrender.com/change-notes`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            notes_checked: checkablesRef.current,
            notes_position: positionsRef.current
          }),
        })
        .then(response => {
          if (!response.ok) throw new Error('Ошибка сети');
          return response.json();
        })
        .then(data => {
          if (data.message == "OK") {
            setCheckables([]);
            setPositions([]);
          }
        })
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isSearch]);

const toggleNote = (id: number, isChecked: boolean) => {
  setCheckedMap((prev) => ({ ...prev, [id]: isChecked }));
  setNotes((prev) =>
    prev.map((note) => (note.id === id ? { ...note, isChecked } : note))
  );
  setCheckables((prev) => [...prev, { id, isChecked }]);
};

  const onDragEnd = (result: any) => {
    if (!result.destination) return;

    const newNotes = Array.from(notes);
    const [moved] = newNotes.splice(result.source.index, 1);
    newNotes.splice(result.destination.index, 0, moved);

    setNotes(newNotes);
    setPositions((prev) => [...prev, {
      id: moved.id,
      fromIndex: result.source.index,
      toIndex: result.destination.index,
    }]);
  };

const handleSearch = () => {
  const value = (document.querySelector('#search-field') as HTMLInputElement).value;

  setSearch(value !== '');
  setSearchTxt(value);
  setOffset(0);
  setHasMore(true);
  setNotes([]);
  setSearchVersion(prev => prev + 1);

  hasLoaded.current = false;

  setTimeout(() => loadMore(), 0);
};


  useEffect(() => {
  if (offset === 0) {
    loadMore();
  }
}, [searchVersion]);

  const itemData = {
    notes,
    toggleNote,
    loadMore,
    hasMore,
    loading: loadingRef.current,
  };

 const listRef = useRef<any>(null);

  const handleScroll = ({ scrollOffset, scrollDirection }: ListOnScrollProps) => {
    if (
      scrollDirection === 'forward' &&
      listRef.current &&
      hasMore &&
      !loadingRef.current
    ) {
      const visibleCount = Math.ceil(600 / ITEM_HEIGHT);
      if (scrollOffset / ITEM_HEIGHT + visibleCount >= notes.length - 5) {
        loadMore();
      }
    }
  };

  useEffect(() => {
    if (!hasLoaded.current) {
      hasLoaded.current = true;
      loadMore();
    }
  }, [searchTxt]);

  return (
    <div className="App">
      <p id="title">Элементы</p>
      <p id="subtitle">Чтобы вернуться ко всему списку, нажмите на поиск при пустом поле ввода</p>
      <input id="search-field" placeholder='Поиск' />
      <button id="search-btn" onClick={handleSearch}>Поиск</button>
      <p id="search-txt">{searchTxt}</p>
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable
          droppableId="droppable"
          mode="virtual"
          renderClone={(provided, snapshot, rubric) => (
            <div
              ref={provided.innerRef}
              {...provided.draggableProps}
              {...provided.dragHandleProps}
              style={{
                ...provided.draggableProps.style,
                padding: 8,
                background: '#eee',
              }}
            >
              {notes[rubric.source.index]?.name}
            </div>
          )}
        >
          {(droppableProvided) => (
          <List
            ref={listRef}
            height={600}
            itemCount={notes.length}
            itemSize={ITEM_HEIGHT}
            width="100%"
            onScroll={handleScroll}
            outerRef={droppableProvided.innerRef}
            itemData={itemData}
          >
            {Row}
          </List>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}

export default App;

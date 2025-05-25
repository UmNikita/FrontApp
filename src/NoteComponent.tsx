type Note = {
  name: string;
  checked: boolean;
  onChecked: () => void;
};

function NoteComponent({ name, checked, onChecked }: Note) {
  return (
    <div className="element">
      <span>{name}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChecked}
      />
    </div>
  );
}

export default NoteComponent;
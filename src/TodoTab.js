import React from 'react';

const TodoTab = ({
  todoList,
  setTodoList,
  klantenserviceTodoList,
  setKlantenserviceTodoList
}) => (
  <div className="card">
    <h2>To-Do Lijsten</h2>
    <div className="card">
      <h3>Service To-Do's</h3>
      <ul>
        {todoList.map((todo, index) => (
          <li key={index} style={{ textDecoration: todo.done ? 'line-through' : 'none' }}>
            <input
              type="checkbox"
              checked={todo.done}
              onChange={(e) => {
                const newList = [...todoList];
                newList[index].done = e.target.checked;
                setTodoList(newList);
              }}
            />
            {todo.text}
          </li>
        ))}
      </ul>
    </div>
    <div className="card">
      <h3>Klantenservice To-Do's</h3>
      <ul>
        {klantenserviceTodoList.map((todo, index) => (
          <li key={index} style={{ textDecoration: todo.done ? 'line-through' : 'none' }}>
            <input
              type="checkbox"
              checked={todo.done}
              onChange={(e) => {
                const newList = [...klantenserviceTodoList];
                newList[index].done = e.target.checked;
                setKlantenserviceTodoList(newList);
              }}
            />
            {todo.text}
          </li>
        ))}
      </ul>
    </div>
  </div>
);

export default TodoTab; 
import React, { Component } from 'react';

export interface CounterProps {
}

interface CounterState {
  currentCount: number;
}

export class Counter extends Component<CounterProps, CounterState> {
  public constructor(props: CounterProps) {
    super(props);
    this.state = { 
      currentCount: 0 
    };
  }

  public render(): JSX.Element {
    return (
      <div>
        <h1>Counter</h1>
        <p>This is a simple example of a React component.</p>
        <p aria-live="polite">Current count: <strong>{this.state.currentCount}</strong></p>
        <button className="btn btn-primary" onClick={this._incrementCounter}>Increment</button>
      </div>
    );
  }

  private _incrementCounter = (): void => {
    this.setState({
      currentCount: this.state.currentCount + 1
    });
  };
}

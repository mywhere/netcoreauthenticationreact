import React, { Component } from 'react';
import authService from './api-authorization/AuthorizeService'

export interface FetchDataProps {

}

interface FetchDataState {
  forecasts: any[];
  loading: boolean;
}

export class FetchData extends Component<FetchDataProps, FetchDataState> {
  public constructor(props: FetchDataProps) {
    super(props);
    this.state = { 
      forecasts: [], 
      loading: true 
    };
  }

  public componentDidMount(): void {
    this._populateWeatherData();
  }

  private renderForecastsTable(forecasts: any[]): JSX.Element {
    return (
      <table className='table table-striped' aria-labelledby="tabelLabel">
        <thead>
          <tr>
            <th>Date</th>
            <th>Temp. (C)</th>
            <th>Temp. (F)</th>
            <th>Summary</th>
          </tr>
        </thead>
        <tbody>
          {forecasts.map(forecast =>
            <tr key={forecast.date}>
              <td>{forecast.date}</td>
              <td>{forecast.temperatureC}</td>
              <td>{forecast.temperatureF}</td>
              <td>{forecast.summary}</td>
            </tr>
          )}
        </tbody>
      </table>
    );
  }

  public render(): JSX.Element {
    const { loading, forecasts } = this.state;
    let contents = loading
      ? (<p><em>Loading...</em></p>)
      : this.renderForecastsTable(forecasts);

    return (
      <div>
        <h1 id="tabelLabel" >Weather forecast</h1>
        <p>This component demonstrates fetching data from the server.</p>
        {contents}
      </div>
    );
  }

  private async _populateWeatherData() {
    const token = await authService.getAccessToken();
    const response = await fetch('weatherforecast', {
      headers: !token ? {} : { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    this.setState({ forecasts: data, loading: false });
  }
}

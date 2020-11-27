import React, { Component, Fragment } from 'react';
import { NavItem, NavLink } from 'reactstrap';
import { Link } from 'react-router-dom';
import authService from './AuthorizeService';
import { ApplicationPaths } from './ApiAuthorizationConstants';

export interface LoginMenuProps {

}

interface LoginMenuState {
    isAuthenticated?: boolean;
    userName?: string | null;
}

export class LoginMenu extends Component<LoginMenuProps, LoginMenuState> {
    private _subscription!: number;

    public constructor(props: LoginMenuProps) {
        super(props);

        this.state = {
            isAuthenticated: false,
            userName: undefined
        };
    }

    public componentDidMount(): void {
        this._subscription = authService.subscribe(() => this._populateState());
        this._populateState();
    }

    public componentWillUnmount(): void {
        authService.unsubscribe(this._subscription);
    }

    private async _populateState(): Promise<void> {
        const [isAuthenticated, user] = await Promise.all([authService.isAuthenticated(), authService.getUser()])
        this.setState({
            isAuthenticated,
            userName: user && user.name
        });
    }

    public render(): JSX.Element {
        const { isAuthenticated, userName } = this.state;
        if (!isAuthenticated) {
            const registerPath = `${ApplicationPaths.Register}`;
            const loginPath = `${ApplicationPaths.Login}`;
            return this._anonymousView(registerPath, loginPath);
        } else {
            const profilePath = `${ApplicationPaths.Profile}`;
            const logoutPath = { pathname: `${ApplicationPaths.LogOut}`, state: { local: true } };
            return this._authenticatedView(profilePath, logoutPath, userName);
        }
    }

    private _authenticatedView(profilePath: string, logoutPath: any, userName?: string | null): JSX.Element {
        return (
            <Fragment>
                <NavItem>
                    <NavLink tag={Link} className="text-dark" to={profilePath}>Hello {userName}</NavLink>
                </NavItem>
                <NavItem>
                    <NavLink tag={Link} className="text-dark" to={logoutPath}>Logout</NavLink>
                </NavItem>
            </Fragment>
        );
    }

    private _anonymousView(registerPath: string, loginPath: string): JSX.Element {
        return (
            <Fragment>
                <NavItem>
                    <NavLink tag={Link} className="text-dark" to={registerPath}>Register</NavLink>
                </NavItem>
                <NavItem>
                    <NavLink tag={Link} className="text-dark" to={loginPath}>Login</NavLink>
                </NavItem>
            </Fragment>
        );
    }
}

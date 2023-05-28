import { push } from 'connected-react-router';
import { toast } from 'react-toastify';

import { apiFetch } from '@tietokilta/ilmomasiina-components';
import type { AdminLoginResponse } from '@tietokilta/ilmomasiina-models';
import appPaths from '../../paths';
import type { DispatchAction } from '../../store/types';
import {
  LOGGING_IN,
  LOGIN_FAILED,
  LOGIN_SUCCEEDED,
  RESET,
} from './actionTypes';

export const loggingIn = () => <const>{
  type: LOGGING_IN,
};

export const loginSucceeded = (payload: AdminLoginResponse) => <const>{
  type: LOGIN_SUCCEEDED,
  payload,
};

export const loginFailed = () => <const>{
  type: LOGIN_FAILED,
};

export const resetState = () => <const>{
  type: RESET,
};

export type AuthActions =
  | ReturnType<typeof loggingIn>
  | ReturnType<typeof loginSucceeded>
  | ReturnType<typeof loginFailed>
  | ReturnType<typeof resetState>;

export const login = (email: string, password: string) => async (dispatch: DispatchAction) => {
  dispatch(loggingIn());

  try {
    const sessionResponse = await apiFetch<AdminLoginResponse>('authentication', {
      method: 'POST',
      body: {
        email,
        password,
      },
    });
    if (!sessionResponse) {
      throw Error('Bad response');
    }
    dispatch(loginSucceeded(sessionResponse));
    dispatch(push(appPaths.adminEventsList));
    return true;
  } catch (e) {
    dispatch(loginFailed());
    return false;
  }
};

export const redirectToLogin = () => (dispatch: DispatchAction) => {
  dispatch(resetState());
  dispatch(push(appPaths.adminLogin));
};

export const logout = () => async (dispatch: DispatchAction) => {
  dispatch(resetState());
  dispatch(redirectToLogin());
  toast.success('Uloskirjautuminen onnistui.', {
    autoClose: 10000,
  });
};

export const loginExpired = () => (dispatch: DispatchAction) => {
  toast.error('Sisäänkirjautumisesi on vanhentunut. Kirjaudu sisään uudelleen.', {
    autoClose: 10000,
  });
  dispatch(redirectToLogin());
};

export const renewLogin = (accessToken: string) => async (dispatch: DispatchAction) => {
  if (accessToken) {
    const sessionResponse = await apiFetch<AdminLoginResponse>('authentication/renew', {
      method: 'POST',
      body: {
        accessToken,
      },
      headers: {
        Authorization: accessToken,
      },
    });
    if (sessionResponse) {
      dispatch(loginSucceeded(sessionResponse));
      return true;
    }
  }
  dispatch(loginExpired());
  return false;
};

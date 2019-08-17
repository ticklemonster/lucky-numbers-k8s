import { connect } from 'react-redux';
import Numbers from './numbers';
import { Actions } from '../actions'

const mapStateToProps = state => {
  return {
    numbers: state.numbers,
    guesses: state.guesses,
    isBusy: state.busy,
  }
}

const mapDispatchToProps = dispatch => {
  return {
    onRefresh: () => {
      dispatch(Actions.refreshNumbers(dispatch))
    },
    onPlaceGuess: value => {
        const nval = parseInt(value);
        if (isNaN(nval) || nval < 1 || nval > 100) return;

        dispatch(Actions.addGuess(nval))
    },
    onClearGuess: guessObj => {
      if (!guessObj || !guessObj.id) return;

      dispatch(Actions.deleteGuess(guessObj.id));
    }
  }
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Numbers);

